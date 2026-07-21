const pool = require('../db');
const { writeAudit } = require('../services/auditService');
const { reconcileWallets } = require('../services/ledgerService');

async function overview(_req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM transactions) AS transactions,
        (SELECT COALESCE(SUM(balance), 0)::text FROM wallet) AS wallet_balance,
        (SELECT COUNT(*)::int FROM fraud_events WHERE status IN ('open', 'blocked')) AS fraud_events,
        (SELECT COUNT(*)::int FROM funding_intents WHERE status = 'pending') AS pending_funding,
        (SELECT COUNT(*)::int FROM scheduled_transfers WHERE status = 'active') AS active_schedules
    `);
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function auditLogs(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const result = await pool.query(
      `SELECT al.*, u.email AS actor_email
       FROM audit_logs al LEFT JOIN users u ON u.userid = al.actor_userid
       ORDER BY al.created_at DESC LIMIT $1`,
      [limit]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function fraudEvents(req, res, next) {
  try {
    const status = req.query.status || 'open';
    const result = await pool.query(
      `SELECT fe.*, u.email FROM fraud_events fe
       LEFT JOIN users u ON u.userid = fe.userid
       WHERE ($1 = 'all' OR fe.status = $1)
       ORDER BY fe.created_at DESC LIMIT 100`,
      [status]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function reviewFraudEvent(req, res, next) {
  const status = String(req.body.status);
  if (!['reviewed', 'dismissed', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Invalid review status' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE fraud_events SET status = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE fraudeventid = $1 RETURNING *`,
      [req.params.eventId, status, req.user.userId]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Fraud event not found' });
    }
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'fraud.reviewed',
      resourceType: 'fraud_event',
      resourceId: req.params.eventId,
      metadata: { status },
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

async function reconcile(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const discrepancies = await reconcileWallets(client);
    const run = await client.query(
      `INSERT INTO reconciliation_runs(run_by, discrepancy_count, results)
       VALUES ($1, $2, $3) RETURNING runid, discrepancy_count, created_at`,
      [req.user.userId, discrepancies.length, discrepancies]
    );
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'reconciliation.completed',
      resourceType: 'reconciliation_run',
      resourceId: run.rows[0].runid,
      metadata: { discrepancyCount: discrepancies.length },
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    return res.json({ ...run.rows[0], discrepancies });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { overview, auditLogs, fraudEvents, reviewFraudEvent, reconcile };

const pool = require('../db');
const parseAmount = require('../utils/amount');
const { writeAudit } = require('../services/auditService');

async function createSchedule(req, res, next) {
  const receiverId = Number(req.body.receiverId);
  const amount = parseAmount(req.body.amount);
  const nextRunAt = new Date(req.body.nextRunAt);
  const frequency = String(req.body.frequency || 'once');
  const currency = String(req.body.currency || 'USD').toUpperCase();
  const description = String(req.body.description || '').trim().slice(0, 255);
  if (!Number.isInteger(receiverId) || receiverId === req.user.userId || amount === null ||
      Number.isNaN(nextRunAt.getTime()) || nextRunAt <= new Date() ||
      !['once', 'daily', 'weekly', 'monthly'].includes(frequency) ||
      !/^[A-Z]{3}$/.test(currency)) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Provide a valid recipient, amount, schedule, and frequency' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wallets = await client.query(
      `SELECT userid FROM wallet
       WHERE currency = $1 AND userid = ANY($2::int[])`,
      [currency, [req.user.userId, receiverId]]
    );
    if (wallets.rowCount !== 2) {
      await client.query('ROLLBACK');
      await req.idempotency.release();
      return res.status(404).json({ error: `Both participants need a ${currency} wallet` });
    }
    const result = await client.query(
      `INSERT INTO scheduled_transfers
         (sender_userid, receiver_userid, amount, currency, description, frequency, next_run_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.userId, receiverId, amount, currency, description, frequency, nextRunAt]
    );
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'schedule.created',
      resourceType: 'scheduled_transfer',
      resourceId: result.rows[0].scheduleid,
      metadata: { receiverId, amount, frequency, nextRunAt },
      ipAddress: req.ip,
    });
    const body = { schedule: result.rows[0] };
    await req.idempotency.complete(client, 201, body);
    await client.query('COMMIT');
    return res.status(201).json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    await req.idempotency.release();
    return next(error);
  } finally {
    client.release();
  }
}

async function listSchedules(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT st.*, receiver.name AS receiver_name
       FROM scheduled_transfers st JOIN users receiver ON receiver.userid = st.receiver_userid
       WHERE st.sender_userid = $1 ORDER BY st.created_at DESC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function cancelSchedule(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE scheduled_transfers SET status = 'cancelled'
       WHERE scheduleid = $1 AND sender_userid = $2 AND status IN ('active', 'paused')
       RETURNING scheduleid, status`,
      [req.params.scheduleId, req.user.userId]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Schedule cannot be cancelled' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = { createSchedule, listSchedules, cancelSchedule };

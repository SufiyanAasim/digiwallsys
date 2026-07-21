const pool = require('../db');
const parseAmount = require('../utils/amount');
const { writeAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');
const { executeTransfer } = require('../services/transferService');

async function createRequest(req, res, next) {
  const amount = parseAmount(req.body.amount);
  const payerId = req.body.payerId == null ? null : Number(req.body.payerId);
  const note = String(req.body.note || '').trim().slice(0, 255);
  if (amount === null || (payerId !== null && (!Number.isInteger(payerId) || payerId === req.user.userId))) {
    await req.idempotency.release();
    return res.status(400).json({ error: 'Provide a valid payer and amount' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (payerId !== null) {
      const payer = await client.query('SELECT name FROM users WHERE userid = $1', [payerId]);
      if (!payer.rowCount) {
        await client.query('ROLLBACK');
        await req.idempotency.release();
        return res.status(404).json({ error: 'Payer not found' });
      }
    }
    const result = await client.query(
      `INSERT INTO payment_requests(requester_userid, payer_userid, amount, note)
       VALUES ($1, $2, $3, $4)
       RETURNING requestid, payer_userid, amount, currency, note, status, expires_at, created_at`,
      [req.user.userId, payerId, amount, note]
    );
    if (payerId !== null) {
      await createNotification(client, {
        userId: payerId,
        category: 'money',
        title: 'Payment requested',
        body: `${result.rows[0].currency} ${Number(amount).toFixed(2)} was requested from you.`,
        data: { requestId: result.rows[0].requestid },
      });
    }
    await writeAudit(client, {
      actorUserId: req.user.userId,
      action: 'payment_request.created',
      resourceType: 'payment_request',
      resourceId: result.rows[0].requestid,
      metadata: { payerId, amount },
      ipAddress: req.ip,
    });
    await client.query('COMMIT');
    const body = {
      request: result.rows[0],
      qrPayload: `digiwallsys://request/${result.rows[0].requestid}`,
    };
    await req.idempotency.complete(201, body);
    return res.status(201).json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    await req.idempotency.release();
    return next(error);
  } finally {
    client.release();
  }
}

async function listRequests(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT pr.*, requester.name AS requester_name, payer.name AS payer_name
       FROM payment_requests pr
       JOIN users requester ON requester.userid = pr.requester_userid
       LEFT JOIN users payer ON payer.userid = pr.payer_userid
       WHERE pr.requester_userid = $1 OR pr.payer_userid = $1
       ORDER BY pr.created_at DESC LIMIT 100`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getRequest(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT pr.requestid, pr.requester_userid, pr.payer_userid, pr.amount, pr.currency,
              pr.note, pr.status, pr.expires_at, requester.name AS requester_name
       FROM payment_requests pr JOIN users requester ON requester.userid = pr.requester_userid
       WHERE pr.requestid = $1
         AND (pr.payer_userid IS NULL OR pr.requester_userid = $2 OR pr.payer_userid = $2)`,
      [req.params.requestId, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Payment request not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '22P02') return res.status(400).json({ error: 'Invalid request ID' });
    return next(error);
  }
}

async function acceptRequest(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query(
      'SELECT * FROM payment_requests WHERE requestid = $1 FOR UPDATE',
      [req.params.requestId]
    );
    const request = requestResult.rows[0];
    if (!request || request.status !== 'pending' || new Date(request.expires_at) <= new Date()) {
      await client.query('ROLLBACK');
      await req.idempotency.release();
      return res.status(409).json({ error: 'Payment request is not payable' });
    }
    if (request.requester_userid === req.user.userId ||
        (request.payer_userid !== null && request.payer_userid !== req.user.userId)) {
      await client.query('ROLLBACK');
      await req.idempotency.release();
      return res.status(403).json({ error: 'This payment request is not assigned to you' });
    }
    const transfer = await executeTransfer(client, {
      senderId: req.user.userId,
      receiverId: request.requester_userid,
      amount: request.amount,
      description: request.note || 'Payment request',
      idempotencyKey: req.idempotency.key,
      source: 'payment_request',
      ipAddress: req.ip,
    });
    if (transfer.blocked) {
      await client.query('COMMIT');
      const body = { error: 'Payment blocked by risk controls', reasons: transfer.fraud.reasons };
      await req.idempotency.complete(403, body);
      return res.status(403).json(body);
    }
    await client.query(
      `UPDATE payment_requests
       SET status = 'paid', payer_userid = $2, transactionid = $3, updated_at = CURRENT_TIMESTAMP
       WHERE requestid = $1`,
      [request.requestid, req.user.userId, transfer.transaction.transactionid]
    );
    await client.query('COMMIT');
    const body = { requestId: request.requestid, transaction: transfer.transaction };
    await req.idempotency.complete(200, body);
    return res.json(body);
  } catch (error) {
    await client.query('ROLLBACK');
    await req.idempotency.release();
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  } finally {
    client.release();
  }
}

async function updateRequestStatus(req, res, next) {
  const action = req.params.action;
  const status = action === 'decline' ? 'declined' : 'cancelled';
  const ownership = action === 'decline' ? 'payer_userid' : 'requester_userid';
  try {
    const result = await pool.query(
      `UPDATE payment_requests SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE requestid = $2 AND ${ownership} = $3 AND status = 'pending'
       RETURNING requestid, status`,
      [status, req.params.requestId, req.user.userId]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Payment request cannot be updated' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = { createRequest, listRequests, getRequest, acceptRequest, updateRequestStatus };

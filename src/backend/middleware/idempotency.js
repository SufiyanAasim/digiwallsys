const { createHash } = require('node:crypto');
const pool = require('../db');

module.exports = function idempotency(scope) {
  return async (req, res, next) => {
    const key = req.get('idempotency-key');
    if (!key || key.length > 128) {
      return res.status(400).json({ error: 'A valid Idempotency-Key header is required' });
    }

    const requestHash = createHash('sha256')
      .update(JSON.stringify({ method: req.method, path: req.path, body: req.body }))
      .digest('hex');
    try {
      const inserted = await pool.query(
        `INSERT INTO idempotency_records(userid, scope, idempotency_key, request_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING idempotency_key`,
        [req.user.userId, scope, key, requestHash]
      );
      if (!inserted.rowCount) {
        const existing = await pool.query(
          `SELECT request_hash, status, response_status, response_body
           FROM idempotency_records
           WHERE userid = $1 AND scope = $2 AND idempotency_key = $3`,
          [req.user.userId, scope, key]
        );
        const record = existing.rows[0];
        if (!record || record.request_hash !== requestHash) {
          return res.status(409).json({ error: 'Idempotency key was used for a different request' });
        }
        if (record.status === 'completed') {
          return res.status(record.response_status).json(record.response_body);
        }
        return res.status(409).json({ error: 'An identical request is already processing' });
      }

      req.idempotency = {
        key,
        complete: (status, body) => pool.query(
          `UPDATE idempotency_records
           SET status = 'completed', response_status = $4, response_body = $5
           WHERE userid = $1 AND scope = $2 AND idempotency_key = $3`,
          [req.user.userId, scope, key, status, body]
        ),
        release: () => pool.query(
          `DELETE FROM idempotency_records
           WHERE userid = $1 AND scope = $2 AND idempotency_key = $3 AND status = 'pending'`,
          [req.user.userId, scope, key]
        ),
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

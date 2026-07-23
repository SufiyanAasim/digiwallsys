const pool = require('../db');

const REASON_LABELS = {
  single_transfer_limit: 'A transfer exceeded the single-transfer limit',
  daily_amount_limit: 'A transfer would have exceeded your daily transfer limit',
  hourly_velocity_limit: 'Too many transfers were attempted in a short time',
};

function describeReasons(details) {
  const reasons = Array.isArray(details?.reasons) ? details.reasons : [];
  if (!reasons.length) return 'Unusual account activity was detected';
  return reasons.map((reason) => REASON_LABELS[reason] || reason).join('; ');
}

async function listAlerts(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT fraudeventid, event_type, risk_score, status, details, created_at
       FROM fraud_events WHERE userid = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    return res.json(result.rows.map((row) => ({
      alertId: row.fraudeventid,
      riskScore: row.risk_score,
      status: row.status,
      createdAt: row.created_at,
      message: describeReasons(row.details),
    })));
  } catch (error) {
    return next(error);
  }
}

module.exports = { listAlerts };

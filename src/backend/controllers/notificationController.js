const pool = require('../db');

async function listNotifications(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT notificationid, category, title, body, data, read_at, created_at
       FROM notifications WHERE userid = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const result = await pool.query(
      `UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE notificationid = $1 AND userid = $2 RETURNING notificationid, read_at`,
      [req.params.notificationId, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Notification not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function getPreferences(req, res, next) {
  try {
    const result = await pool.query(
      `INSERT INTO notification_preferences(userid) VALUES ($1)
       ON CONFLICT (userid) DO UPDATE SET userid = EXCLUDED.userid
       RETURNING *`,
      [req.user.userId]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function updatePreferences(req, res, next) {
  const alertAmount = req.body.spendingAlertAmount === null || req.body.spendingAlertAmount === ''
    ? null
    : Number(req.body.spendingAlertAmount);
  if (alertAmount !== null && (!Number.isFinite(alertAmount) || alertAmount <= 0)) {
    return res.status(400).json({ error: 'Spending alert amount must be positive or null' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO notification_preferences
         (userid, money_movement, security_events, spending_alert_amount, push_enabled)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (userid) DO UPDATE SET
         money_movement = EXCLUDED.money_movement,
         security_events = EXCLUDED.security_events,
         spending_alert_amount = EXCLUDED.spending_alert_amount,
         push_enabled = EXCLUDED.push_enabled,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        req.user.userId,
        req.body.moneyMovement !== false,
        req.body.securityEvents !== false,
        alertAmount,
        req.body.pushEnabled !== false,
      ]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function registerDevice(req, res, next) {
  const token = String(req.body.expoPushToken || '');
  if (!/^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token)) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO push_devices(userid, expo_push_token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (expo_push_token) DO UPDATE SET
         userid = EXCLUDED.userid, platform = EXCLUDED.platform,
         active = true, updated_at = CURRENT_TIMESTAMP
       RETURNING deviceid, platform, active`,
      [req.user.userId, token, String(req.body.platform || '').slice(0, 20)]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listNotifications, markRead, getPreferences, updatePreferences, registerDevice };

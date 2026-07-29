const pool = require('../db');

async function sendPushNotifications() {
  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    result = await client.query(`
      SELECT n.notificationid, n.userid, n.title, n.body, n.data
      FROM notifications n
      LEFT JOIN notification_preferences np ON np.userid = n.userid
      WHERE n.push_sent_at IS NULL AND n.push_failed_at IS NULL
        AND COALESCE(np.push_enabled, true)
        AND (n.push_processing_at IS NULL
          OR n.push_processing_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
      ORDER BY n.created_at
      FOR UPDATE OF n SKIP LOCKED
      LIMIT 50
    `);
    const ids = result.rows.map((item) => item.notificationid);
    if (ids.length) {
      await client.query(
        `UPDATE notifications
         SET push_processing_at = CURRENT_TIMESTAMP,
             push_attempt_count = push_attempt_count + 1
         WHERE notificationid = ANY($1::uuid[])`,
        [ids]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  for (const notification of result.rows) {
    try {
      const devices = await pool.query(
        `SELECT expo_push_token FROM push_devices
         WHERE userid = $1 AND active = true ORDER BY created_at`,
        [notification.userid]
      );
      const messages = devices.rows.map(({ expo_push_token: to }) => ({
        to,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
      }));
      if (messages.length) {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(messages),
        });
        if (!response.ok) throw new Error(`Push service returned ${response.status}`);
      }
      await pool.query(
        `UPDATE notifications
         SET push_sent_at = CURRENT_TIMESTAMP, push_processing_at = NULL
         WHERE notificationid = $1`,
        [notification.notificationid]
      );
    } catch (error) {
      await pool.query(
        `UPDATE notifications
         SET push_processing_at = NULL,
             push_failed_at = CASE WHEN push_attempt_count >= 5 THEN CURRENT_TIMESTAMP ELSE push_failed_at END
         WHERE notificationid = $1`,
        [notification.notificationid]
      );
    }
  }
}

function startNotificationWorker() {
  if (process.env.ENABLE_PUSH_WORKER === 'false') return () => {};
  const run = () => sendPushNotifications().catch((error) => {
    console.error('Notification worker failed:', error.message);
  });
  const timer = setInterval(run, 30_000);
  run();
  return () => clearInterval(timer);
}

module.exports = { sendPushNotifications, startNotificationWorker };

const pool = require('../db');

async function sendPushNotifications() {
  const result = await pool.query(`
    SELECT n.notificationid, n.userid, n.title, n.body, n.data,
           COALESCE(array_agg(pd.expo_push_token) FILTER (WHERE pd.active), '{}') AS tokens
    FROM notifications n
    LEFT JOIN notification_preferences np ON np.userid = n.userid
    LEFT JOIN push_devices pd ON pd.userid = n.userid AND pd.active = true
    WHERE n.push_sent_at IS NULL AND COALESCE(np.push_enabled, true)
    GROUP BY n.notificationid
    ORDER BY n.created_at
    LIMIT 50
  `);

  for (const notification of result.rows) {
    const messages = notification.tokens.map((to) => ({
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
      if (!response.ok) throw new Error(`Expo push service returned ${response.status}`);
    }
    await pool.query(
      'UPDATE notifications SET push_sent_at = CURRENT_TIMESTAMP WHERE notificationid = $1',
      [notification.notificationid]
    );
  }
}

function startNotificationWorker() {
  if (process.env.ENABLE_PUSH_WORKER === 'false') return () => {};
  const run = () => sendPushNotifications().catch((error) => {
    console.error('Notification worker failed:', error.message);
  });
  const timer = setInterval(run, 30_000);
  timer.unref();
  run();
  return () => clearInterval(timer);
}

module.exports = { sendPushNotifications, startNotificationWorker };

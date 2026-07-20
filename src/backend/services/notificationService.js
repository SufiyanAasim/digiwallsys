async function createNotification(client, {
  userId,
  category,
  title,
  body,
  data = {},
}) {
  const preference = await client.query(
    'SELECT * FROM notification_preferences WHERE userid = $1',
    [userId]
  );
  const settings = preference.rows[0];
  if (category === 'money' && settings && !settings.money_movement) return;
  if (category === 'security' && settings && !settings.security_events) return;

  await client.query(
    `INSERT INTO notifications(userid, category, title, body, data)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, category, title, body, data]
  );
}

async function createSpendingAlert(client, userId, amount, reference, currency = 'USD') {
  const result = await client.query(
    `SELECT spending_alert_amount FROM notification_preferences
     WHERE userid = $1 AND spending_alert_amount IS NOT NULL`,
    [userId]
  );
  const threshold = Number(result.rows[0]?.spending_alert_amount);
  if (threshold && Number(amount) >= threshold) {
    await createNotification(client, {
      userId,
      category: 'alert',
      title: 'Spending alert',
      body: `A payment of ${currency} ${Number(amount).toFixed(2)} reached your alert threshold.`,
      data: { reference },
    });
  }
}

module.exports = { createNotification, createSpendingAlert };

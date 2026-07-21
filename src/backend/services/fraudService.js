async function assessTransfer(client, { userId, receiverId, amount }) {
  const maxTransfer = Number(process.env.MAX_TRANSFER_AMOUNT || 10000);
  const dailyLimit = Number(process.env.DAILY_TRANSFER_AMOUNT || 25000);
  const hourlyCountLimit = Number(process.env.HOURLY_TRANSFER_COUNT || 20);

  const activity = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour')::int AS hourly_count,
       COALESCE(SUM(t.amount) FILTER (WHERE t.timestamp > CURRENT_TIMESTAMP - INTERVAL '1 day'), 0)::text AS daily_total
     FROM transactions t
     JOIN wallet w ON w.walletid = t.senderwalletid
     WHERE w.userid = $1`,
    [userId]
  );

  const reasons = [];
  let score = 0;
  if (Number(amount) > maxTransfer) { reasons.push('single_transfer_limit'); score += 80; }
  if (Number(activity.rows[0].daily_total) + Number(amount) > dailyLimit) {
    reasons.push('daily_amount_limit'); score += 70;
  }
  if (activity.rows[0].hourly_count >= hourlyCountLimit) {
    reasons.push('hourly_velocity_limit'); score += 70;
  }

  if (reasons.length) {
    await client.query(
      `INSERT INTO fraud_events(userid, event_type, risk_score, status, details)
       VALUES ($1, 'transfer_velocity', $2, 'blocked', $3)`,
      [userId, Math.min(score, 100), { receiverId, amount, reasons }]
    );
  }
  return { blocked: reasons.length > 0, score: Math.min(score, 100), reasons };
}

module.exports = { assessTransfer };

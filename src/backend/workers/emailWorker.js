const pool = require('../db');

async function deliverEmails() {
  const result = await pool.query(
    `SELECT emailid, recipient, template, payload
     FROM email_outbox WHERE sent_at IS NULL AND failed_at IS NULL
     ORDER BY created_at LIMIT 25`
  );
  for (const email of result.rows) {
    if (process.env.EMAIL_WEBHOOK_URL) {
      const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${process.env.EMAIL_DELIVERY_TOKEN || ''}`,
        },
        body: JSON.stringify(email),
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`Development email queued: ${email.template} -> ${email.recipient.replace(/(^.).*(@.*$)/, '$1***$2')}`);
    } else {
      continue;
    }
    await pool.query('UPDATE email_outbox SET sent_at = CURRENT_TIMESTAMP WHERE emailid = $1', [email.emailid]);
  }
}

function startEmailWorker() {
  if (process.env.ENABLE_EMAIL_WORKER === 'false') return () => {};
  const run = () => deliverEmails().catch((error) => console.error('Email worker failed:', error.message));
  const timer = setInterval(run, 30_000);
  timer.unref();
  run();
  return () => clearInterval(timer);
}

module.exports = { deliverEmails, startEmailWorker };

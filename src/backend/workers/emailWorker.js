const pool = require('../db');

async function deliverEmails() {
  for (let index = 0; index < 25; index += 1) {
    const client = await pool.connect();
    let email;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT emailid, recipient, template, payload, attempt_count
         FROM email_outbox
         WHERE sent_at IS NULL AND failed_at IS NULL
           AND (processing_at IS NULL OR processing_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes')
         ORDER BY created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 1`
      );
      email = result.rows[0];
      if (!email) {
        await client.query('COMMIT');
        return;
      }
      await client.query(
        `UPDATE email_outbox
         SET processing_at = CURRENT_TIMESTAMP, attempt_count = attempt_count + 1
         WHERE emailid = $1`,
        [email.emailid]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    try {
      if (process.env.EMAIL_WEBHOOK_URL) {
        const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${process.env.EMAIL_DELIVERY_TOKEN || ''}`,
            'idempotency-key': String(email.emailid),
          },
          body: JSON.stringify(email),
        });
        if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
      } else {
        console.log(`Development email queued: ${email.template} -> ${email.recipient.replace(/(^.).*(@.*$)/, '$1***$2')}`);
      }
      await pool.query(
        `UPDATE email_outbox
         SET sent_at = CURRENT_TIMESTAMP, processing_at = NULL, last_error = NULL
         WHERE emailid = $1`,
        [email.emailid]
      );
    } catch (error) {
      await pool.query(
        `UPDATE email_outbox
         SET processing_at = NULL, last_error = $2,
             failed_at = CASE WHEN attempt_count >= 5 THEN CURRENT_TIMESTAMP ELSE failed_at END
         WHERE emailid = $1`,
        [email.emailid, error.message.slice(0, 500)]
      );
    }
  }
}

function startEmailWorker() {
  if (process.env.ENABLE_EMAIL_WORKER === 'false') return () => {};
  const run = () => deliverEmails().catch((error) => console.error('Email worker failed:', error.message));
  const timer = setInterval(run, 30_000);
  run();
  return () => clearInterval(timer);
}

module.exports = { deliverEmails, startEmailWorker };

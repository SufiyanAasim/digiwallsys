async function queueEmail(client, { userId, recipient, template, payload }) {
  await client.query(
    `INSERT INTO email_outbox(userid, recipient, template, payload)
     VALUES ($1, $2, $3, $4)`,
    [userId, recipient, template, payload]
  );
}

function developmentToken(token) {
  return process.env.NODE_ENV === 'production' ? undefined : token;
}

module.exports = { queueEmail, developmentToken };

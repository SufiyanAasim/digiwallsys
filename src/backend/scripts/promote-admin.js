require('dotenv').config();
const pool = require('../db');

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- user@example.com');
  process.exit(1);
}

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING userid, email",
      [email]
    );
    if (!result.rowCount) throw new Error('User not found');
    await client.query(
      `INSERT INTO audit_logs(action, resource_type, resource_id, metadata)
       VALUES ('admin.promoted_bootstrap', 'user', $1, $2)`,
      [String(result.rows[0].userid), { email }]
    );
    await client.query('COMMIT');
    console.log(`Promoted ${email} to admin.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

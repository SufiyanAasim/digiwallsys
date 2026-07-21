const pool = require('../db');

async function getBalance(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT walletid, balance, currency FROM wallet WHERE userid = $1`,
      [req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Wallet not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getBalance };

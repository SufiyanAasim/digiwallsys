const express = require('express');
const pool = require('../db');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

router.get('/me', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT userid AS id, name, email, role,
              (email_verified_at IS NOT NULL) AS email_verified
       FROM users WHERE userid = $1`,
      [req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT userid, name FROM users
       WHERE userid <> $1 AND email_verified_at IS NOT NULL
       ORDER BY name LIMIT 200`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

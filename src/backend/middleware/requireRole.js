const pool = require('../db');

module.exports = function requireRole(role) {
  return async (req, res, next) => {
    try {
      const result = await pool.query('SELECT role FROM users WHERE userid = $1', [req.user.userId]);
      if (result.rows[0]?.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      req.user.role = result.rows[0].role;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

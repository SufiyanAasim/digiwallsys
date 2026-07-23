const pool = require('../db');
const parseAmount = require('../utils/amount');

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function createCategory(req, res, next) {
  const name = String(req.body.name || '').trim().slice(0, 60);
  const monthlyLimit = parseAmount(req.body.monthlyLimit);
  if (!name || monthlyLimit === null) {
    return res.status(400).json({ error: 'Provide a category name and a positive monthly limit' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO budget_categories(userid, name, monthly_limit) VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.userId, name, monthlyLimit]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A category with this name already exists' });
    return next(error);
  }
}

async function listCategories(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT bc.*, COALESCE(spend.total, 0) AS spent_this_month
       FROM budget_categories bc
       LEFT JOIN (
         SELECT t.category, SUM(t.amount) AS total
         FROM transactions t
         JOIN wallet w ON w.walletid = t.senderwalletid
         WHERE w.userid = $1 AND t.timestamp >= $2
         GROUP BY t.category
       ) spend ON spend.category = bc.name
       WHERE bc.userid = $1
       ORDER BY bc.created_at DESC`,
      [req.user.userId, startOfMonth()]
    );
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function updateCategory(req, res, next) {
  const monthlyLimit = parseAmount(req.body.monthlyLimit);
  if (monthlyLimit === null) return res.status(400).json({ error: 'Monthly limit must be positive with at most two decimals' });
  try {
    const result = await pool.query(
      `UPDATE budget_categories SET monthly_limit = $1, updated_at = CURRENT_TIMESTAMP
       WHERE categoryid = $2 AND userid = $3 RETURNING *`,
      [monthlyLimit, req.params.categoryId, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Budget category not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    return next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const result = await pool.query(
      'DELETE FROM budget_categories WHERE categoryid = $1 AND userid = $2 RETURNING categoryid',
      [req.params.categoryId, req.user.userId]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Budget category not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { createCategory, listCategories, updateCategory, deleteCategory };

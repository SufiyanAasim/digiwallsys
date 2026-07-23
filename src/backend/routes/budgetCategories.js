const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} = require('../controllers/budgetCategoryController');

const router = express.Router();
router.use(authenticate);
router.get('/', listCategories);
router.post('/', createCategory);
router.put('/:categoryId', updateCategory);
router.delete('/:categoryId', deleteCategory);

module.exports = router;

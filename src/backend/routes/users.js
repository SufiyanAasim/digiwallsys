const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  changePassword,
  getCurrentUser,
  listUsers,
  updateProfile,
} = require('../controllers/userController');

const router = express.Router();
router.use(authenticate);

router.get('/me', getCurrentUser);
router.patch('/me', updateProfile);
router.patch('/me/password', changePassword);
router.get('/', listUsers);

module.exports = router;

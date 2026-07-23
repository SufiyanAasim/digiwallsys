const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  addMember,
  listMembers,
  listSharedWallets,
  removeMember,
  updateMember,
} = require('../controllers/familyController');

const router = express.Router();
router.use(authenticate);
router.get('/members', listMembers);
router.post('/members', addMember);
router.put('/members/:userId', updateMember);
router.delete('/members/:userId', removeMember);
router.get('/shared-wallets', listSharedWallets);

module.exports = router;

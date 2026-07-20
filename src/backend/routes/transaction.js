const express = require('express');
const authenticate = require('../middleware/authenticate');
const idempotency = require('../middleware/idempotency');
const {
  exportHistory,
  getHistory,
  getReceipt,
  sendMoney,
} = require('../controllers/transactionController');

const router = express.Router();
router.use(authenticate);
router.post('/send', idempotency('transaction.send'), sendMoney);
router.get('/history', getHistory);
router.get('/export', exportHistory);
router.get('/receipt/:reference', getReceipt);

module.exports = router;

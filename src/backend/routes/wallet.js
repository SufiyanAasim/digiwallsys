const express = require('express');
const authenticate = require('../middleware/authenticate');
const idempotency = require('../middleware/idempotency');
const {
  addCurrencyWallet,
  convertCurrency,
  getBalance,
  listConversions,
  listWallets,
} = require('../controllers/walletController');

const router = express.Router();
router.use(authenticate);
router.get('/balance', getBalance);
router.get('/', listWallets);
router.post('/currencies', addCurrencyWallet);
router.post('/convert', idempotency('wallet.convert'), convertCurrency);
router.get('/conversions', listConversions);

module.exports = router;

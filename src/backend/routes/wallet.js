const express = require('express');
const authenticate = require('../middleware/authenticate');
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
router.post('/convert', convertCurrency);
router.get('/conversions', listConversions);

module.exports = router;

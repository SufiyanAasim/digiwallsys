const express = require('express');
const authenticate = require('../middleware/authenticate');
const { getBalance } = require('../controllers/walletController');

const router = express.Router();
router.use(authenticate);
router.get('/balance', getBalance);

module.exports = router;

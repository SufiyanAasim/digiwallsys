const express = require('express');
const authenticate = require('../middleware/authenticate');
const idempotency = require('../middleware/idempotency');
const {
  createFundingIntent,
  listFundingIntents,
  providerWebhook,
} = require('../controllers/fundingController');

const router = express.Router();
router.post('/webhooks/:provider', providerWebhook);
router.get('/intents', authenticate, listFundingIntents);
router.post('/intents', authenticate, idempotency('funding.intent'), createFundingIntent);

module.exports = router;

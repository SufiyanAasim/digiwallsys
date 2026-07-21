const express = require('express');
const authenticate = require('../middleware/authenticate');
const idempotency = require('../middleware/idempotency');
const {
  acceptRequest,
  createRequest,
  getRequest,
  listRequests,
  updateRequestStatus,
} = require('../controllers/paymentRequestController');

const router = express.Router();
router.use(authenticate);
router.get('/', listRequests);
router.get('/:requestId', getRequest);
router.post('/', idempotency('payment_request.create'), createRequest);
router.post('/:requestId/accept', idempotency('payment_request.accept'), acceptRequest);
router.post('/:requestId/decline', (req, _res, next) => { req.params.action = 'decline'; next(); }, updateRequestStatus);
router.post('/:requestId/cancel', (req, _res, next) => { req.params.action = 'cancel'; next(); }, updateRequestStatus);

module.exports = router;

const express = require('express');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const {
  auditLogs,
  fraudEvents,
  overview,
  reconcile,
  reviewFraudEvent,
} = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, requireRole('admin'));
router.get('/overview', overview);
router.get('/audit-logs', auditLogs);
router.get('/fraud-events', fraudEvents);
router.post('/fraud-events/:eventId/review', reviewFraudEvent);
router.post('/reconciliation', reconcile);

module.exports = router;

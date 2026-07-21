const express = require('express');
const authenticate = require('../middleware/authenticate');
const idempotency = require('../middleware/idempotency');
const { cancelSchedule, createSchedule, listSchedules } = require('../controllers/scheduleController');

const router = express.Router();
router.use(authenticate);
router.get('/', listSchedules);
router.post('/', idempotency('schedule.create'), createSchedule);
router.post('/:scheduleId/cancel', cancelSchedule);

module.exports = router;

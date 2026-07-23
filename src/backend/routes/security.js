const express = require('express');
const authenticate = require('../middleware/authenticate');
const { listAlerts } = require('../controllers/securityController');

const router = express.Router();
router.use(authenticate);
router.get('/alerts', listAlerts);

module.exports = router;

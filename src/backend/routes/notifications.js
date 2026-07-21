const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  getPreferences,
  listNotifications,
  markRead,
  registerDevice,
  updatePreferences,
} = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticate);
router.get('/', listNotifications);
router.post('/:notificationId/read', markRead);
router.get('/preferences/current', getPreferences);
router.put('/preferences/current', updatePreferences);
router.post('/devices', registerDevice);

module.exports = router;

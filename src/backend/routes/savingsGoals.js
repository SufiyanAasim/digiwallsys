const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  archiveGoal,
  contributeToGoal,
  createGoal,
  listGoals,
  withdrawFromGoal,
} = require('../controllers/savingsGoalController');

const router = express.Router();
router.use(authenticate);
router.get('/', listGoals);
router.post('/', createGoal);
router.post('/:goalId/contribute', contributeToGoal);
router.post('/:goalId/withdraw', withdrawFromGoal);
router.post('/:goalId/archive', archiveGoal);

module.exports = router;

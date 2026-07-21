require('dotenv').config();

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const app = require('./app');
const { startEmailWorker } = require('./workers/emailWorker');
const { startNotificationWorker } = require('./workers/notificationWorker');
const { startScheduleWorker } = require('./workers/scheduleWorker');
const port = process.env.PORT || 5000;

const stopWorkers = [
  startEmailWorker(),
  startNotificationWorker(),
  startScheduleWorker(),
];

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`digiwallsys API listening on http://localhost:${port}`);
});

const shutdown = () => {
  stopWorkers.forEach((stop) => stop());
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

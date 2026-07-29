require('dotenv').config();

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.NODE_ENV === 'production'
    && process.env.ENABLE_EMAIL_WORKER !== 'false'
    && (!process.env.EMAIL_WEBHOOK_URL || !process.env.EMAIL_DELIVERY_TOKEN)) {
  throw new Error('Production requires EMAIL_WEBHOOK_URL and EMAIL_DELIVERY_TOKEN');
}

const { startEmailWorker } = require('./workers/emailWorker');
const { startNotificationWorker } = require('./workers/notificationWorker');
const { startScheduleWorker } = require('./workers/scheduleWorker');

function startWorkers() {
  return [
    startEmailWorker(),
    startNotificationWorker(),
    startScheduleWorker(),
  ];
}

if (require.main === module) {
  const stopWorkers = startWorkers();
  const shutdown = () => {
    stopWorkers.forEach((stop) => stop());
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  console.log('digiwallsys background workers started');
}

module.exports = { startWorkers };

require('dotenv').config();

for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const app = require('./app');
const port = process.env.PORT || 5000;

let stopWorkers = [];
if (process.env.RUN_INLINE_WORKERS === 'true') {
  const { startWorkers } = require('./worker');
  stopWorkers = startWorkers();
  console.log('digiwallsys background workers started inline');
}

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`digiwallsys API listening on http://localhost:${port}`);
});

const shutdown = () => {
  stopWorkers.forEach((stop) => stop());
  server.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

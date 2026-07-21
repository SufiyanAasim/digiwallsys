const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const docs = readFileSync(join(root, 'docs', 'api', 'API.md'), 'utf8');
const routeDirectory = join(root, 'src', 'backend', 'routes');
const mounts = {
  admin: '/api/admin',
  auth: '/api/auth',
  funding: '/api/funding',
  notifications: '/api/notifications',
  paymentRequests: '/api/payment-requests',
  schedules: '/api/schedules',
  transaction: '/api/transactions',
  users: '/api/users',
  wallet: '/api/wallet',
};
const endpoints = ['/api/health', '/api/ready'];

for (const [route, mount] of Object.entries(mounts)) {
  const source = readFileSync(join(routeDirectory, `${route}.js`), 'utf8');
  for (const match of source.matchAll(/router\.(?:get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
    endpoints.push(`${mount}${match[1] === '/' ? '' : match[1]}`);
  }
}

const missing = [...new Set(endpoints)].filter((endpoint) => !docs.includes(endpoint));
if (missing.length) {
  console.error(`API endpoints missing from docs/api/API.md: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`API documentation check passed: ${new Set(endpoints).size} endpoints documented.`);

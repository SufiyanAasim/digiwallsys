const { createHmac, randomUUID } = require('node:crypto');
require('dotenv').config();

const providerReference = process.argv[2];
const status = process.argv[3] || 'succeeded';
const provider = process.env.FUNDING_PROVIDER || 'sandbox';
const secret = process.env.FUNDING_WEBHOOK_SECRET;
const baseUrl = (process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');

if (!providerReference || !secret || !['succeeded', 'failed'].includes(status)) {
  console.error('Usage: npm run funding:sandbox -- <provider-reference> [succeeded|failed]');
  console.error('FUNDING_WEBHOOK_SECRET must be configured.');
  process.exit(1);
}

const body = JSON.stringify({
  eventId: `sandbox_${randomUUID()}`,
  providerReference,
  status,
});
const signature = createHmac('sha256', secret).update(body).digest('hex');

fetch(`${baseUrl}/api/funding/webhooks/${provider}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-provider-signature': signature },
  body,
}).then(async (response) => {
  console.log(response.status, await response.text());
  if (!response.ok) process.exitCode = 1;
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

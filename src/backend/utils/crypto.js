const { createHash, randomBytes, timingSafeEqual, createHmac } = require('node:crypto');

const randomToken = () => randomBytes(32).toString('base64url');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function verifyHmac(payload, signature, secret) {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && timingSafeEqual(left, right);
}

module.exports = { randomToken, hashToken, verifyHmac };

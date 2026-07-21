const jwt = require('jsonwebtoken');

module.exports = function authenticate(req, res, next) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'digiwallsys',
      audience: 'digiwallsys-mobile',
    });
    req.user = { userId: Number(payload.userId), role: payload.role };
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

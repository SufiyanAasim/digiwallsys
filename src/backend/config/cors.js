const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://digiwallsys.vercel.app';

function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function resolveAllowedOrigins(environment = process.env) {
  const configuredOrigins = String(environment.CORS_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (environment.NODE_ENV !== 'production' && configuredOrigins.length === 0) {
    return true;
  }

  const publicWebOrigin = normalizeOrigin(
    environment.PUBLIC_WEB_ORIGIN || DEFAULT_PUBLIC_WEB_ORIGIN
  );

  return [...new Set([publicWebOrigin, ...configuredOrigins].filter(Boolean))];
}

module.exports = {
  DEFAULT_PUBLIC_WEB_ORIGIN,
  resolveAllowedOrigins,
};

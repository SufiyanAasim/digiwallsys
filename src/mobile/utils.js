export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (!error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error')) {
    return 'Unable to reach digiwallsys. Check your connection and try again.';
  }
  // The API answers unknown paths with a bare "Route not found". That surfaces
  // when this build is newer than the deployed API, so explain it rather than
  // showing a router-level string the user cannot act on.
  if (error.response?.status === 404 && error.response?.data?.error === 'Route not found') {
    return 'This feature is not available on the connected server yet. It needs the latest API release.';
  }
  return error.response?.data?.error || error.message || fallback;
}

export function parsePositiveAmount(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function formatMoney(amount, currency = 'USD') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Unknown/unsupported currency code: fall back to a plain formatted amount.
    return `${currency || 'USD'} ${value.toFixed(2)}`;
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function titleize(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

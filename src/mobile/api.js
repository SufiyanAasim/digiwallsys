import axios from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveSession } from './session';

const DEFAULT_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000'
  : 'https://digiwallsys-api.onrender.com';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/$/, '');

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
const sessionApi = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let refreshPromise;
const TOKEN_REFRESH_WINDOW_MS = 30_000;

function accessTokenExpiresSoon(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload || typeof globalThis.atob !== 'function') return false;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const { exp } = JSON.parse(globalThis.atob(padded));
    return Number.isFinite(exp) && exp * 1000 <= Date.now() + TOKEN_REFRESH_WINDOW_MS;
  } catch {
    // If a provider ever returns an opaque access token, let the API validate
    // it and retain the response interceptor as the authoritative fallback.
    return false;
  }
}

function refreshSessionOnce() {
  refreshPromise ||= refreshUserSession().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function idempotencyKey(scope) {
  return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

api.interceptors.request.use(async (config) => {
  let token = await getAccessToken();
  const refreshToken = await getRefreshToken();

  // Refresh before sending an authenticated request when the access token is
  // missing or about to expire. This avoids an expected-but-noisy 401 from
  // /api/users/me every time a remembered web session is restored.
  if (refreshToken && (!token || accessTokenExpiresSoon(token))) {
    try {
      const session = await refreshSessionOnce();
      token = session.accessToken;
    } catch (refreshError) {
      await clearSession();
      throw refreshError;
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retried || original?.url?.includes('/auth/refresh')) {
      throw error;
    }
    original._retried = true;
    try {
      const session = await refreshSessionOnce();
      original.headers.Authorization = `Bearer ${session.accessToken}`;
      return api(original);
    } catch (refreshError) {
      await clearSession();
      throw refreshError;
    }
  }
);

export const loginUser = (email, password) => sessionApi.post('/api/auth/login', { email, password });
export const registerUser = (name, email, password) => sessionApi.post('/api/auth/register', { name, email, password });
export const verifyEmail = (token) => sessionApi.post('/api/auth/verify-email', { token });
export const resendVerification = (email) => sessionApi.post('/api/auth/resend-verification', { email });
export const forgotPassword = (email) => sessionApi.post('/api/auth/forgot-password', { email });
export const resetPassword = (token, password) => sessionApi.post('/api/auth/reset-password', { token, password });

export async function refreshUserSession() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('No saved session');
  const response = await sessionApi.post('/api/auth/refresh', { refreshToken });
  await saveSession(response.data);
  return response.data;
}

export async function logoutUser() {
  const refreshToken = await getRefreshToken();
  return api.post('/api/auth/logout', { refreshToken });
}

export const getCurrentUser = () => api.get('/api/users/me');
export const getBalance = (currency) => api.get('/api/wallet/balance', { params: currency ? { currency } : undefined });
export const getWallets = () => api.get('/api/wallet');
export const addCurrencyWallet = (currency) => api.post('/api/wallet/currencies', { currency });
export const convertCurrency = (fromCurrency, toCurrency, amount) => api.post(
  '/api/wallet/convert',
  { fromCurrency, toCurrency, amount },
  { headers: { 'Idempotency-Key': idempotencyKey('conversion') } }
);
export const getConversions = () => api.get('/api/wallet/conversions');
export const getUsers = () => api.get('/api/users');
export const getTransactions = (params = {}) => api.get('/api/transactions/history', { params });
export const getReceipt = (reference) => api.get(`/api/transactions/receipt/${reference}`);
export const sendMoney = (receiverId, amount, description, category, options = {}) => api.post(
  '/api/transactions/send',
  { receiverId, amount, description, category: category || undefined, currency: options.currency, fromOwnerId: options.fromOwnerId },
  { headers: { 'Idempotency-Key': idempotencyKey('transfer') } }
);
export const updateTransactionCategory = (reference, category) => api.patch(
  `/api/transactions/${reference}/category`,
  { category: category || null }
);

export const createFundingIntent = (amount) => api.post(
  '/api/funding/intents',
  { amount },
  { headers: { 'Idempotency-Key': idempotencyKey('funding') } }
);
export const getFundingIntents = () => api.get('/api/funding/intents');

export const createPaymentRequest = (payerId, amount, note, currency = 'USD') => api.post(
  '/api/payment-requests',
  { payerId: payerId || null, amount, note, currency },
  { headers: { 'Idempotency-Key': idempotencyKey('request') } }
);
export const getPaymentRequests = () => api.get('/api/payment-requests');
export const getPaymentRequest = (requestId) => api.get(`/api/payment-requests/${requestId}`);
export const acceptPaymentRequest = (requestId) => api.post(
  `/api/payment-requests/${requestId}/accept`,
  {},
  { headers: { 'Idempotency-Key': idempotencyKey('request-payment') } }
);
export const updatePaymentRequest = (requestId, action) => api.post(`/api/payment-requests/${requestId}/${action}`);

export const createSchedule = (payload) => api.post(
  '/api/schedules',
  payload,
  { headers: { 'Idempotency-Key': idempotencyKey('schedule') } }
);
export const getSchedules = () => api.get('/api/schedules');
export const cancelSchedule = (scheduleId) => api.post(`/api/schedules/${scheduleId}/cancel`);

export const getNotifications = () => api.get('/api/notifications');
export const markNotificationRead = (id) => api.post(`/api/notifications/${id}/read`);
export const getNotificationPreferences = () => api.get('/api/notifications/preferences/current');
export const updateNotificationPreferences = (payload) => api.put('/api/notifications/preferences/current', payload);
export const registerPushDevice = (expoPushToken, platform) => api.post('/api/notifications/devices', { expoPushToken, platform });

export const getAdminOverview = () => api.get('/api/admin/overview');
export const getAuditLogs = () => api.get('/api/admin/audit-logs');
export const getFraudEvents = (status = 'all') => api.get('/api/admin/fraud-events', { params: { status } });
export const reviewFraudEvent = (eventId, status) => api.post(`/api/admin/fraud-events/${eventId}/review`, { status });
export const runReconciliation = () => api.post('/api/admin/reconciliation');
export const getFxRates = () => api.get('/api/admin/fx-rates');
export const setFxRate = (baseCurrency, quoteCurrency, rate) => api.post('/api/admin/fx-rates', { baseCurrency, quoteCurrency, rate });

export const getFamilyMembers = (currency = 'USD') => api.get('/api/family/members', { params: { currency } });
export const addFamilyMember = (email, spendingLimit, currency = 'USD') => api.post('/api/family/members', { email, spendingLimit, currency });
export const updateFamilyMember = (userId, spendingLimit, currency = 'USD') => api.put(`/api/family/members/${userId}`, { spendingLimit, currency });
export const removeFamilyMember = (userId, currency = 'USD') => api.delete(`/api/family/members/${userId}`, { params: { currency } });
export const getSharedWallets = () => api.get('/api/family/shared-wallets');

export function transactionExportUrl() {
  return `${API_BASE_URL}/api/transactions/export`;
}
export function transactionStatementUrl() {
  return `${API_BASE_URL}/api/transactions/statement`;
}

export const getSavingsGoals = () => api.get('/api/savings-goals');
export const createSavingsGoal = (name, targetAmount, roundUpEnabled, currency = 'USD') => api.post(
  '/api/savings-goals',
  { name, targetAmount, roundUpEnabled, currency }
);
export const contributeToSavingsGoal = (goalId, amount) => api.post(`/api/savings-goals/${goalId}/contribute`, { amount });
export const withdrawFromSavingsGoal = (goalId, amount) => api.post(`/api/savings-goals/${goalId}/withdraw`, { amount });
export const archiveSavingsGoal = (goalId) => api.post(`/api/savings-goals/${goalId}/archive`);

export const getBudgetCategories = () => api.get('/api/budget-categories');
export const createBudgetCategory = (name, monthlyLimit, currency = 'USD') => api.post(
  '/api/budget-categories',
  { name, monthlyLimit, currency }
);
export const updateBudgetCategory = (categoryId, monthlyLimit) => api.put(`/api/budget-categories/${categoryId}`, { monthlyLimit });
export const deleteBudgetCategory = (categoryId) => api.delete(`/api/budget-categories/${categoryId}`);

export const getSecurityAlerts = () => api.get('/api/security/alerts');

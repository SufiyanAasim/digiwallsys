import axios from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveSession } from './session';

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'
).replace(/\/$/, '');

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
const sessionApi = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
let refreshPromise;

function idempotencyKey(scope) {
  return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
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
    refreshPromise ||= refreshUserSession().finally(() => { refreshPromise = null; });
    try {
      const session = await refreshPromise;
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
export const getBalance = () => api.get('/api/wallet/balance');
export const getUsers = () => api.get('/api/users');
export const getTransactions = (params = {}) => api.get('/api/transactions/history', { params });
export const getReceipt = (reference) => api.get(`/api/transactions/receipt/${reference}`);
export const sendMoney = (receiverId, amount, description) => api.post(
  '/api/transactions/send',
  { receiverId, amount, description },
  { headers: { 'Idempotency-Key': idempotencyKey('transfer') } }
);

export const createFundingIntent = (amount) => api.post(
  '/api/funding/intents',
  { amount },
  { headers: { 'Idempotency-Key': idempotencyKey('funding') } }
);
export const getFundingIntents = () => api.get('/api/funding/intents');

export const createPaymentRequest = (payerId, amount, note) => api.post(
  '/api/payment-requests',
  { payerId: payerId || null, amount, note },
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

export function transactionExportUrl() {
  return `${API_BASE_URL}/api/transactions/export`;
}

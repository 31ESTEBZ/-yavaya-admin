import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('yavaya_admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('yavaya_admin_token');
      localStorage.removeItem('yavaya_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const sendOtp = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOtp = (phone, code) => api.post('/auth/verify-otp', { phone, code });

// ─── Admin stats ──────────────────────────────────────────────────────────────
export const getStats = () => api.get('/admin/stats');
export const getMapCouriers = () => api.get('/admin/couriers/map');

// ─── Orders ───────────────────────────────────────────────────────────────────
export const getOrders = (params) => api.get('/admin/orders', { params });
export const getOrder = (id) => api.get(`/admin/orders/${id}`);

// ─── Couriers ─────────────────────────────────────────────────────────────────
export const getCouriers = (params) => api.get('/admin/couriers', { params });
export const getCourier = (id) => api.get(`/admin/couriers/${id}`);
export const verifyCourier = (id, data) => api.patch(`/admin/couriers/${id}/verify`, data);
export const walletTopup = (id, data) => api.post(`/admin/couriers/${id}/wallet/topup`, data);
export const blockUser = (id, data) => api.patch(`/admin/users/${id}/block`, data);

// ─── Disputes ─────────────────────────────────────────────────────────────────
export const getDisputes = (params) => api.get('/admin/disputes', { params });
export const getDispute = (id) => api.get(`/admin/disputes/${id}`);
export const resolveDispute = (id, data) => api.patch(`/admin/disputes/${id}/resolve`, data);

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getCommissionsReport = (params) => api.get('/admin/reports/commissions', { params });
export const getCouriersRanking = () => api.get('/admin/reports/couriers/ranking');

export default api;

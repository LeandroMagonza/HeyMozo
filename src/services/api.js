import axios from 'axios';

// REACT_APP_API_URL is set in .env.development for local dev
// In production builds, it's not set so it falls back to '/api' (relative)
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  // Necesario para que el browser envíe la cookie HttpOnly `hm_device`
  // en endpoints customer-facing (Sprint 3.2/3.3). Inocuo para endpoints
  // admin que autentican por header `Authorization: Bearer`.
  withCredentials: true,
});

// Add a request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem('heymozo_token');
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 responses (expired/invalid tokens)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid/expired, clear local storage and redirect to login
      localStorage.removeItem('heymozo_token');
      localStorage.removeItem('heymozo_user');
      localStorage.removeItem('heymozo_permissions');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

console.log('API Base URL:', api.defaults.baseURL);

// Authentication endpoints
export const requestLogin = (email) => 
  api.post('/auth/login-request', { email });

export const verifyLoginToken = (token) => 
  api.post('/auth/verify-token', { token });

export const getCurrentUser = () => 
  api.get('/auth/me');

export const logout = () => {
  localStorage.removeItem('heymozo_token');
  localStorage.removeItem('heymozo_user');
  localStorage.removeItem('heymozo_permissions');
  return Promise.resolve();
};

// User management endpoints (admin only)
export const getUsers = () => 
  api.get('/users');

export const createUser = (userData) => 
  api.post('/users', userData);

export const updateUser = (userId, userData) => 
  api.put(`/users/${userId}`, userData);

export const deleteUser = (userId) => 
  api.delete(`/users/${userId}`);

export const getUserPermissions = (userId) => 
  api.get(`/users/${userId}/permissions`);

export const addUserPermission = (userId, resourceType, resourceId) => 
  api.post(`/users/${userId}/permissions`, { resourceType, resourceId });

export const removeUserPermission = (userId, resourceType, resourceId) => 
  api.delete(`/users/${userId}/permissions`, { 
    data: { resourceType, resourceId } 
  });

// Original API endpoints

export const getCompany = (companyId) => 
  api.get(`/companies/${companyId}`);

export const updateCompany = (id, data) => api.put(`/companies/${id}`, data);

export const getBranches = (companyId) => 
  api.get('/branches', { params: { companyId } });

export const getBranch = (branchId) => 
  api.get(`/branches/${branchId}`);

export const updateBranch = (branchId, data) => api.put(`/branches/${branchId}`, data);

export const getTables = (branchId) => 
  api.get('/tables', { params: { branchId } });

export const getTable = (tableId) => {
  console.log('Fetching table:', tableId); // Debug log
  return api.get(`/tables/${tableId}`);
};

export const createTable = (data) => api.post('/tables', data);

export const updateTable = (tableId, data) => api.put(`/tables/${tableId}`, data);

export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);

export const createBranch = (data) => api.post('/branches', data);

export const deleteBranch = (id) => api.delete(`/branches/${id}`);

export const getCompanies = () => api.get('/companies');

export const deleteCompany = (id) => api.delete(`/companies/${id}`);

export const createCompany = (data) => api.post('/companies', data);

export const markTableEventsSeen = (tableId) => 
  api.put(`/tables/${tableId}/mark-seen`);

export const markTableAsAvailable = (tableId) => 
  api.put(`/tables/${tableId}/mark-available`);

export const markTableAsOccupied = (tableId) => 
  api.put(`/tables/${tableId}/mark-occupied`);

export const sendEvent = (tableId, eventData) => 
  api.post(`/tables/${tableId}/events`, eventData);

export const releaseAllTables = (branchId) =>
  api.post(`/branches/${branchId}/release-all-tables`);

// Public menu endpoint (no auth required — accessed by customers)
export const getPublicMenu = (branchId) =>
  api.get(`/branches/${branchId}/public-menu`);

// Menu — Categorías
export const getCategories = (branchId) => api.get(`/branches/${branchId}/categories`);
export const createCategory = (branchId, data) => api.post(`/branches/${branchId}/categories`, data);
export const updateCategory = (branchId, categoryId, data) => api.put(`/branches/${branchId}/categories/${categoryId}`, data);
export const deleteCategory = (branchId, categoryId) => api.delete(`/branches/${branchId}/categories/${categoryId}`);
export const reorderCategories = (branchId, order) => api.put(`/branches/${branchId}/categories/reorder`, { order });

// Menu — Ítems
export const getMenuItems = (categoryId) => api.get(`/categories/${categoryId}/items`);
export const createMenuItem = (categoryId, data) => api.post(`/categories/${categoryId}/items`, data);
export const updateMenuItem = (categoryId, itemId, data) => api.put(`/categories/${categoryId}/items/${itemId}`, data);
export const deleteMenuItem = (categoryId, itemId) => api.delete(`/categories/${categoryId}/items/${itemId}`);
export const reorderMenuItems = (categoryId, order) => api.put(`/categories/${categoryId}/items/reorder`, { order });

// Staff — OpShell
export const getActiveOrders = (branchId) =>
  api.get(`/branches/${branchId}/orders/active`);

export const getActiveAlerts = (branchId) =>
  api.get(`/branches/${branchId}/active-alerts`);

export const markOrderReady = (orderId) =>
  api.post(`/orders/${orderId}/mark-ready`);

export const staffAddOrder = (data) =>
  api.post('/orders/staff', data);

// Customer device + session + orders (Sprint 3.2/3.3) — usan cookie HttpOnly `hm_device`
export const identifyDevice = (fingerprint, name) =>
  api.post('/devices/identify', { fingerprint, name });

export const attachSession = (tableId) =>
  api.post(`/tables/${tableId}/sessions/attach`);

export const getActiveSession = (tableId) =>
  api.get(`/tables/${tableId}/session/active`);

export const confirmOrder = (tableId, payload) =>
  api.post(`/tables/${tableId}/orders`, payload);

export const getOrder = (orderId) =>
  api.get(`/orders/${orderId}`);

export const getTableOrders = (tableId) =>
  api.get(`/tables/${tableId}/orders`);

// Payment config (Sprint 5.3)
export const disconnectBranchMp = (branchId) =>
  api.delete(`/branches/${branchId}/mp/disconnect`);

// Payments cash/card (Sprint 5.4)
export const requestPayment = (tableId, payload) =>
  api.post(`/tables/${tableId}/payments`, payload);

export const getPaymentStatus = (paymentId) =>
  api.get(`/payments/${paymentId}/status`);

export const cancelPayment = (paymentId) =>
  api.post(`/payments/${paymentId}/cancel`);

export const collectPayment = (paymentId, payload = {}) =>
  api.post(`/payments/${paymentId}/collect`, payload);

export const getPendingPayment = (tableId) =>
  api.get(`/tables/${tableId}/pending-payment`);

// Payments transfer/MODO (Sprint 5.5)
export const declarePaymentPaid = (paymentId, payload = {}) =>
  api.post(`/payments/${paymentId}/declare-paid`, payload);

export const validatePayment = (paymentId) =>
  api.post(`/payments/${paymentId}/validate`);

export const rejectPayment = (paymentId) =>
  api.post(`/payments/${paymentId}/reject`);

export const getAwaitingValidationPayments = (branchId) =>
  api.get(`/branches/${branchId}/payments/awaiting-validation`);

// CajaShell — tab Acciones + liberar mesa (Sprint 5.8)
export const getPaymentActions = (branchId) =>
  api.get(`/branches/${branchId}/payments/actions`);

export const acknowledgePayment = (paymentId) =>
  api.post(`/payments/${paymentId}/acknowledge`);

export const getActiveSessions = (branchId) =>
  api.get(`/branches/${branchId}/sessions/active`);

export const releaseTable = (tableId, payload = {}) =>
  api.post(`/tables/${tableId}/release`, payload);

// CajaShell — tab Club VIP (Sprint 5.10)
export const getClubMembers = (branchId) =>
  api.get(`/branches/${branchId}/club/members`);

// PostPago: review + Club VIP (Sprint 5.9)
export const getPostpagoContext = (paymentId) =>
  api.get(`/payments/${paymentId}/postpago-context`);

export const submitReview = (paymentId, payload) =>
  api.post(`/payments/${paymentId}/review`, payload);

export const markReviewGoogleClick = (reviewId) =>
  api.post(`/reviews/${reviewId}/google-click`);

export const joinClub = (paymentId, payload) =>
  api.post(`/payments/${paymentId}/club-join`, payload);

// User self-profile (Sprint 5.3)
export const getMyProfile = () =>
  api.get('/users/me');

export const updateMyProfile = (data) =>
  api.put('/users/me', data);

export default api;

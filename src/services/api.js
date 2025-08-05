import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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

export default api;

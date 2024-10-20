import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3002';

const api = axios.create({
  baseURL: API_BASE_URL,
});

console.log('API Base URL:', api.defaults.baseURL);

export const getCompany = (companyId) => api.get(`/companies/${companyId}`);
export const getBranches = (companyId) => api.get(`/branches?companyId=${companyId}`);
export const getBranch = (branchId) => api.get(`/branches/${branchId}`);
export const updateBranch = (branchId, data) => api.put(`/branches/${branchId}`, data);
export const getTables = (branchId) => api.get(`/tables?branchId=${branchId}`);
export const getTable = (tableId) => api.get(`/tables/${tableId}`);
export const createTable = (data) => api.post('/tables', data);
export const updateTable = (tableId, data) => api.put(`/tables/${tableId}`, data);
export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);

export default api;

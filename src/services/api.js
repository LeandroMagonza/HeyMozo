import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3002';

const api = axios.create({
  baseURL: API_BASE_URL,
});

console.log('API Base URL:', api.defaults.baseURL);

export const getCompany = (id) => axios.get(`${API_BASE_URL}/companies/${id}`);
export const updateCompany = (id, data) => axios.put(`${API_BASE_URL}/companies/${id}`, data);
export const getBranches = (companyId) => api.get(`/branches?companyId=${companyId}`);
export const getBranch = (branchId) => api.get(`/branches/${branchId}`);
export const updateBranch = (branchId, data) => api.put(`/branches/${branchId}`, data);
export const getTables = (branchId) => api.get(`/tables?branchId=${branchId}`);
export const getTable = (tableId) => api.get(`/tables/${tableId}`);
export const createTable = (data) => api.post('/tables', data);
export const updateTable = (tableId, data) => api.put(`/tables/${tableId}`, data);
export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);
export const createBranch = (data) => axios.post(`${API_BASE_URL}/branches`, data);
export const deleteBranch = (id) => axios.delete(`${API_BASE_URL}/branches/${id}`);
export const getCompanies = () => axios.get(`${API_BASE_URL}/companies`);
export const deleteCompany = (id) => axios.delete(`${API_BASE_URL}/companies/${id}`);
export const createCompany = (data) => axios.post(`${API_BASE_URL}/companies`, data);

export default api;

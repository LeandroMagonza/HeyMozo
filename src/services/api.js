import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

console.log('API Base URL:', api.defaults.baseURL);

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

export const sendEvent = (tableId, eventData) => 
  api.post(`/tables/${tableId}/events`, eventData);

export const releaseAllTables = (branchId) => 
  api.post(`/branches/${branchId}/release-all-tables`);

export default api;

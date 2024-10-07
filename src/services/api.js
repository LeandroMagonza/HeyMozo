import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

console.log('API Base URL:', api.defaults.baseURL);

export const getCompany = (companyId) => api.get(`/companies/${companyId}`);
export const getBranches = (companyId) => api.get(`/branches?companyId=${companyId}`);
export const getBranch = (branchId) => api.get(`/branches/${branchId}`);
export const getTables = (branchId) => api.get(`/tables?branchId=${branchId}`);
export const getTable = (tableId) => api.get(`/tables/${tableId}`);
export const updateTable = (tableId, tableData) => api.put(`/tables/${tableId}`, tableData);

export default api;

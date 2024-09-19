import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api',
});

export const getTables = () => api.get('/tables');
export const getTable = (id) => api.get(`/tables/${id}`);
export const updateTable = (id, data) => api.put(`/tables/${id}`, data);

export default api;

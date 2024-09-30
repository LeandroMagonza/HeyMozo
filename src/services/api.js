import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export const getCompanies = () => api.get("/companies");
export const getCompany = (id) => api.get(`/companies/${id}`);
export const getTables = (companyId) =>
  api.get(`/companies/${companyId}/tables`);
export const getTable = (companyId, tableId) =>
  api.get(`/companies/${companyId}/tables/${tableId}`);
export const updateTable = (companyId, tableId, data) => {
  console.log("Sending PUT request:", { companyId, tableId, data });
  return api
    .put(`/companies/${companyId}/tables/${tableId}`, data, {
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      console.log("PUT response:", response);
      return response.data;
    })
    .catch((error) => {
      console.error(
        "PUT error:",
        error.response ? error.response.data : error.message
      );
      console.error("Full error object:", error);
      throw error;
    });
};

export default api;

const API_BASE_URL = "http://127.0.0.1:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (payload) => api.post("/auth/login", payload);
export const register = (payload) => api.post("/auth/register", payload);
export const validateToken = () => api.get("/auth/validate");
export const validateAdminCredentials = (payload) => api.post("/auth/validate_admin", payload);
export const logout = () => {
  api.post("/auth/logout");
  localStorage.removeItem("access_token");
};
export const getUserInfo = () => api.get("/usuarios/me");

// NUEVO: Obtener Enums
export const getMetadataEnums = () => api.get("/metadata/enums");

// CRUD genérico
export const listResource = (resource, params) =>
  api.get(`/${resource}`, { params });
export const getResource = (resource, id) => api.get(`/${resource}/${id}`);
export const createResource = (resource, data) =>
  api.post(`/${resource}`, data);
export const updateResource = (resource, id, data) =>
  api.put(`/${resource}/${id}`, data);
export const deleteResource = (resource, id) =>
  api.delete(`/${resource}/${id}`);

export const getWeighFromTruckScale = () => api.get("/serial/read");
export const printTicket = (id) => api.post(`/tickets_pesaje/${id}/imprimir`);

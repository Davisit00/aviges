// Usamos la URL CDN compatible con ES Modules para navegadores
import axios from "https://cdn.jsdelivr.net/npm/axios@1.7.2/+esm";
// Agregamos la extensión .js a la importación local
import { API_URL, ENDPOINTS } from "./utils.js";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Auth ---
export const login = (payload) => api.post(ENDPOINTS.LOGIN, payload);
export const register = (payload) => api.post(ENDPOINTS.REGISTER, payload);
export const validateToken = () => api.get(ENDPOINTS.VALIDATE);
export const logout = () => {
  api.post(ENDPOINTS.LOGOUT);
  localStorage.removeItem("access_token");
};

export const getUserInfo = () => api.get(`${ENDPOINTS.USUARIOS}/me`);

// --- Metadatos ---
export const getMetadataEnums = () => api.get(ENDPOINTS.METADATA_ENUMS);

// --- CRUD Genérico ---
export const listResource = (resource, params) =>
  api.get(`/${resource}/all`, { params });

export const getResource = (resource, id) => api.get(`/${resource}/${id}`);

export const createResource = (resource, data) =>
  api.post(`/${resource}`, data);

export const updateResource = (resource, id, data) =>
  api.put(`/${resource}/${id}`, data);

export const deleteResource = (resource, id) =>
  api.delete(`/${resource}/${id}`);

// --- Rutas Combinadas (NUEVAS) ---

// Usuarios Combinados
export const createUsuarioCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_USUARIOS, data);

export const updateUsuarioCombined = (id, data) =>
  api.put(`${ENDPOINTS.COMBINED_USUARIOS}/${id}`, data);

// Choferes Combinados
export const createChoferCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_CHOFERES, data);

export const updateChoferCombined = (id, data) =>
  api.put(`${ENDPOINTS.COMBINED_CHOFERES}/${id}`, data);

// Empresas de Transporte Combinadas
export const createEmpresaCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_EMPRESAS, data);

export const updateEmpresaCombined = (id, data) =>
  api.put(`${ENDPOINTS.COMBINED_EMPRESAS}/${id}`, data);

// Granjas Combinadas
export const createGranjaCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_GRANJAS, data);

export const updateGranjaCombined = (id, data) =>
  api.put(`${ENDPOINTS.COMBINED_GRANJAS}/${id}`, data);

// Lotes Combinados
export const createLoteCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_LOTES, data);

// Ubicaciones Combinadas (NUEVO)
export const createUbicacionCombined = (data) =>
  api.post(ENDPOINTS.COMBINED_UBICACIONES, data);

// --- Hardware / Específicas de Tickets ---
export const getSerialList = () => api.get(ENDPOINTS.SERIAL_LIST);

export const getWeighFromTruckScale = () => api.get(ENDPOINTS.SERIAL_READ);

export const getPrintTicketData = (id) =>
  api.post(`${ENDPOINTS.TICKETS_PESAJE}/${id}/imprimir`);

export const registerWeigh = (data) =>
  api.post(`${ENDPOINTS.TICKETS_PESAJE}/registrar_peso`, data);

// Guardar nota de entrega (POST)
export const saveNotaEntrega = (ticketId, data) =>
  api.post(
    `${ENDPOINTS.TICKETS_PESAJE_NOTA_ENTREGA}/${ticketId}/nota_entrega`,
    data,
  );

// Obtener nota de entrega (GET)
export const getNotaEntrega = (ticketId) =>
  api.get(`${ENDPOINTS.TICKETS_PESAJE_NOTA_ENTREGA}/${ticketId}/nota_entrega`);

// No se usa

export const API_URL = "http://127.0.0.1:5000/api/";

export const ENDPOINTS = {
  LOGIN: API_URL + "auth/login",
  REGISTER: API_URL + "auth/register",
  AUTH: API_URL + "usuarios",
  PRODUCTOS: API_URL + "productos",
  EMPRESAS_TRANSPORTE: API_URL + "empresas_transporte",
  GRANJAS: API_URL + "granjas",
  PRODUCTOS: API_URL + "productos",
  GALPONES: API_URL + "galpones",
  VEHICULOS: API_URL + "vehiculos",
  CHOFERES: API_URL + "choferes",
  TICKETS_PESAJE: API_URL + "tickets_pesaje",
  DETALLES_TRANSPORTE_AVES: API_URL + "detalles_transporte_aves",
};

/*## 🔗 Endpoints CRUD

- **Listar**: `GET /api/<resource>?page=1&per_page=20`
- **Obtener**: `GET /api/<resource>/<id>`
- **Crear**: `POST /api/<resource>`
- **Actualizar**: `PUT/PATCH /api/<resource>/<id>`
- **Eliminar**: `DELETE /api/<resource>/<id>`

*/

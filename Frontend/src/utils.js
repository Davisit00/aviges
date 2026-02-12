// No se usa

export const API_URL = "http://127.0.0.1:5000/api/";

export const ENDPOINTS = {
  // Auth
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  LOGOUT: "/auth/logout",
  VALIDATE: "/auth/validate",

  // Rutas Estándar (Resource based)
  USUARIOS: "/usuarios",
  PRODUCTOS: "/productos",
  EMPRESAS_TRANSPORTE: "/empresas_transporte",
  GRANJAS: "/granjas",
  GALPONES: "/galpones",
  VEHICULOS: "/vehiculos",
  CHOFERES: "/choferes",
  TICKETS_PESAJE: "/tickets_pesaje",
  DETALLES_TRANSPORTE_AVES: "/detalles_transporte_aves",

  // Rutas Combinadas (Transaccionales)
  COMBINED_USUARIOS: "/combined/usuarios",
  COMBINED_CHOFERES: "/combined/choferes",
  COMBINED_EMPRESAS: "/combined/empresas_transporte",
  COMBINED_GRANJAS: "/combined/granjas",
  COMBINED_LOTES: "/combined/lotes",
  COMBINED_UBICACIONES: "/combined/ubicaciones", // NUEVO

  // Hardware / Específicas
  SERIAL_READ: "/serial/read",
  SERIAL_LIST: "/serial/list",
  METADATA_ENUMS: "/metadata/enums",
};

export const COUNTRY_CODES = [
  { name: "Venezuela", code: "+58" },
  { name: "Colombia", code: "+57" },
  { name: "Brasil", code: "+55" },
  { name: "Estados Unidos", code: "+1" },
  { name: "España", code: "+34" },
  { name: "México", code: "+52" },
  { name: "Argentina", code: "+54" },
  { name: "Chile", code: "+56" },
  { name: "Perú", code: "+51" },
  { name: "Ecuador", code: "+593" },
  { name: "Panamá", code: "+507" },
  { name: "República Dominicana", code: "+1-809" },
  { name: "Costa Rica", code: "+506" },
  { name: "Uruguay", code: "+598" },
  { name: "Paraguay", code: "+595" },
  { name: "Bolivia", code: "+591" },
  { name: "Portugal", code: "+351" },
  { name: "Italia", code: "+39" },
  { name: "Francia", code: "+33" },
  { name: "China", code: "+86" },
  { name: "Alemania", code: "+49" },
  { name: "Reino Unido", code: "+44" },
  { name: "Canadá", code: "+1" },
  { name: "Australia", code: "+61" },
  { name: "Rusia", code: "+7" },
  { name: "Japón", code: "+81" },
  { name: "India", code: "+91" },
  { name: "Turquía", code: "+90" },
  { name: "Guatemala", code: "+502" },
  { name: "El Salvador", code: "+503" },
  { name: "Honduras", code: "+504" },
  { name: "Nicaragua", code: "+505" },
  { name: "Cuba", code: "+53" },
  { name: "Puerto Rico", code: "+1-787" },
  { name: "Países Bajos", code: "+31" },
  { name: "Suiza", code: "+41" },
];

/*## 🔗 Endpoints CRUD

- **Listar**: `GET /api/<resource>?page=1&per_page=20`
- **Obtener**: `GET /api/<resource>/<id>`
- **Crear**: `POST /api/<resource>`
- **Actualizar**: `PUT/PATCH /api/<resource>/<id>`
- **Eliminar**: `DELETE /api/<resource>/<id>`

*/

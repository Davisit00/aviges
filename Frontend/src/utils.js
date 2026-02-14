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
  TICKETS_PESAJE_NOTA: "/tickets_pesaje", // base
  TICKETS_PESAJE_REGISTRAR_PESO: "/tickets_pesaje/registrar_peso",
  TICKETS_PESAJE_IMPRIMIR: "/tickets_pesaje", // /:id/imprimir
  TICKETS_PESAJE_NOTA_ENTREGA: "/tickets_pesaje", // /:id/nota_entrega
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

/**
 * Genera el HTML para una barra de búsqueda estandarizada.
 * @param {string} id ID del input
 * @param {string} placeholder Texto de ayuda
 */
export function getSearchInputHTML(id, placeholder = "Buscar...") {
  return `
      <div class="search-container" style="margin-bottom: 15px;">
        <input type="text" id="${id}" placeholder="${placeholder}" 
               style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;">
      </div>
    `;
}

/**
 * Configura el evento de búsqueda en tiempo real.
 * @param {string} inputId ID del input en el DOM.
 * @param {Array} sourceData Array con TODOS los datos originales.
 * @param {Function} renderCallback Función que recibe el array filtrado y actualiza la tabla.
 * @param {Array<string>|Function} criteria Lista de propiedades (strings) o función de filtrado custom.
 *                                          Si es array: busca coincidencia en esas keys. Soporta notación punto 'persona.nombre'.
 *                                          Si es función: (item, term) => boolean.
 */
export function setupSearchListener(
  inputId,
  sourceData,
  renderCallback,
  criteria,
) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.oninput = (e) => {
    const term = e.target.value.toLowerCase().trim();

    if (!term) {
      renderCallback(sourceData);
      return;
    }

    const filtered = sourceData.filter((item) => {
      // Caso 1: Función personalizada
      if (typeof criteria === "function") {
        return criteria(item, term);
      }

      // Caso 2: Array de propiedades (ej: ['nombre', 'persona.cedula'])
      return criteria.some((key) => {
        const keys = key.split(".");
        let val = item;
        for (let k of keys) {
          val = val ? val[k] : null;
        }
        return val && String(val).toLowerCase().includes(term);
      });
    });

    renderCallback(filtered);
  };
}

// Helper para generar una fila de teléfono
export function getPhoneRowHTML(index, countryOptions) {
  return `
    <div class="phone-row" id="row-phone-${index}" style="display:flex; gap:5px; margin-bottom:5px;">
        <select class="ph-tipo" style="width:90px">
            <option value="Celular">Celular</option>
            <option value="Trabajo">Trabajo</option>
            <option value="Casa">Casa</option>
        </select>
        <select class="ph-pais" style="width:140px">${countryOptions}</select>
        <input type="text" class="ph-area" placeholder="Ej. 0414" style="width:70px">
        <input type="text" class="ph-num" placeholder="Número" style="flex:1">
        <button type="button" class="btn-delete-row" onclick="document.getElementById('row-phone-${index}').remove()" style="background:#ff4d4d; color:white; border:none; border-radius:3px; cursor:pointer;">&times;</button>
    </div>`;
}

// Helper para generar una fila de dirección
export function getAddressRowHTML(index) {
  return `
    <div class="address-row" id="row-addr-${index}" style="background:#f0f0f0; padding:10px; border-radius:5px; margin-bottom:5px; position:relative;">
        <button type="button" class="btn-delete-row" onclick="document.getElementById('row-addr-${index}').remove()" style="position:absolute; top:5px; right:5px; background:#ff4d4d; color:white; border:none; border-radius:3px; cursor:pointer;">&times;</button>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:5px;">
            <input type="text" class="addr-estado" placeholder="Estado" required>
            <input type="text" class="addr-muni" placeholder="Municipio" required>
        </div>
        <input type="text" class="addr-sector" placeholder="Sector" style="width:100%; margin-bottom:5px;" required>
        <input type="text" class="addr-desc" placeholder="Av / Calle / Casa / Edificio" style="width:100%">
    </div>`;
}

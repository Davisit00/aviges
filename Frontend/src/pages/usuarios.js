import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
  updateResource,
} from "../api.js"; // IMPORTAR
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js"; // <--- IMPORTAR

let allItems = []; // <--- GLOBAL DATA
let isAdmin = false;

export async function init(container) {
  // 1. Verificar Rol
  const userInfo = await getUserInfo();
  const role = userInfo.data.rol.id || userInfo.data.user_rol;

  if (role !== 1) {
    container.innerHTML = `<div style="padding:20px; color:red;">⛔ Acceso denegado: Se requieren permisos de Administrador.</div>`;
    return;
  }

  isAdmin = true;

  container.innerHTML = `
    <div class="header-section">
      <h2>Gestión de Usuarios</h2>
      <button id="btn-create" class="btn-primary">Crear Usuario</button>
    </div>
    
    ${getSearchInputHTML("search-usuarios", "Buscar usuario, nombre, cédula...")} <!-- INPUT -->

    <div class="table-container">
      <table id="user-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Teléfono</th>
            ${isAdmin ? "<th>Acciones</th>" : ""}
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-create").onclick = showForm;
  loadTable();
}

async function loadTable() {
  const tbody = document.querySelector("#user-table tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";
  try {
    const res = await listResource("usuarios");
    allItems = res.data.items || res.data;

    // SETUP BUSCADOR
    setupSearchListener("search-usuarios", allItems, renderTable, [
      "usuario",
      "persona.nombre",
      "persona.apellido",
      "persona.cedula",
    ]);

    renderTable(allItems);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='5'>Error</td></tr>";
  }
}

// NUEVA FUNCIÓN RENDER
function renderTable(items) {
  const tbody = document.querySelector("#user-table tbody");
  if (!items.length) {
    tbody.innerHTML = "<tr><td colspan='5'>Sin resultados</td></tr>";
    return;
  }

  tbody.innerHTML = items
    .map((user) => {
      // Acceso directo a objetos anidados
      const p = user.persona || {};
      const r = user.rol || {};
      const actionButtons = isAdmin
        ? `<td><button class='btn-edit' data-id='${user.id}'>Editar</button> <button class='btn-delete danger' data-id='${user.id}'>Eliminar</button></td>`
        : "";
      return `
        <tr>
          <td>${user.usuario}</td>
          <td>${p.nombre || ""} ${p.apellido || ""}</td>
          <td>${r.nombre || "N/A"}</td>
          <td>${(p.telefonos?.[0]?.codigo_pais || "") + " " + (p.telefonos?.[0]?.operadora || "") + "-" + (p.telefonos?.[0]?.numero || "") || "N/A"}</td>
          ${actionButtons}
        </tr>`;
    })
    .join("");

  // Re-bind eventos
  if (isAdmin) {
    tbody
      .querySelectorAll(".btn-delete")
      .forEach((b) => (b.onclick = (e) => deleteItem(e.target.dataset.id)));
    tbody
      .querySelectorAll(".btn-edit")
      .forEach((b) => (b.onclick = (e) => showForm(e.target.dataset.id)));
  }
}
// ... resto del archivo

async function showForm() {
  // Cargar Roles
  let roleOptions = "";
  try {
    const res = await listResource("roles");
    const items = res.data.items || res.data;
    roleOptions = items
      .map((r) => `<option value="${r.id}">${r.nombre}</option>`)
      .join("");
  } catch (e) {
    console.error(e);
  }

  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

  const html = `
        <form id="form-usuario">
          <!-- Datos de Cuenta (Igual) -->
          <div class="form-group" style="background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:10px">
            <label style="color:#003B73;">Datos de Cuenta</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                <input type="text" id="usuario" placeholder="Usuario" required>
                <input type="password" id="contrasena" placeholder="Contraseña" required>
                <select id="id_roles" required><option value="">Seleccionar Rol</option>${roleOptions}</select>
            </div>
          </div>

          <!-- Datos Personales -->
          <div class="form-group">
            <label>Datos Personales</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:5px;">
                <input type="text" id="nombre" placeholder="Nombre" required>
                <input type="text" id="apellido" placeholder="Apellido" required>
            </div>
            <div style="display:flex; gap:10px;">
                <select id="tipo_cedula" style="width:60px;"><option value="V">V</option><option value="E">E</option></select>
                <input type="text" id="cedula" placeholder="Cédula" required style="flex:1;">
            </div>
          </div>

          <!-- SECCIÓN DE TELÉFONO -->
          <div class="form-group">
            <label>Teléfono</label>
            <div style="display:flex; gap:5px;">
                <select id="u-ph-tipo" style="width:90px">
                    <option value="Celular">Celular</option>
                    <option value="Casa">Casa</option>
                    <option value="Trabajo">Trabajo</option>
                </select>
                <!-- Select Pais -->
                <select id="u-ph-pais" style="width:140px">${countryOptions}</select>
                <input type="text" id="u-ph-area" placeholder="Ej. 414" style="width:70px">
                <input type="text" id="u-ph-num" placeholder="0664428" style="flex:1;">
            </div>
          </div>
          
          <!-- Dirección -->
          <div class="form-group">
            <label>Dirección</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:5px;">
                <input type="text" id="estado" placeholder="Estado" required>
                <input type="text" id="municipio" placeholder="Municipio" required>
                <input type="text" id="sector" placeholder="Sector" style="width:100%; box-sizing:border-box;" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn-primary">Registrar</button>
            <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
          </div>
        </form>
    `;

  modal.show("Registrar Nuevo Usuario", html, (box) => {
    box.querySelector("#btn-cancel").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = handleSubmit;
  });
}

async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    usuario: document.getElementById("usuario").value,
    contrasena: document.getElementById("contrasena").value || undefined,
    id_roles: parseInt(document.getElementById("id_roles").value),
    persona: {
      nombre: document.getElementById("nombre").value,
      apellido: document.getElementById("apellido").value,
      tipo_cedula: document.getElementById("tipo_cedula").value,
      cedula: document.getElementById("cedula").value,
      direccion: {
        pais: "Venezuela",
        estado: document.getElementById("estado").value,
        municipio: document.getElementById("municipio").value,
        sector: document.getElementById("sector").value,
        descripcion: "",
      },
      // Array de telefonos capturado del form
      telefonos: [
        {
          tipo: document.getElementById("u-ph-tipo").value,
          codigo_pais: document.getElementById("u-ph-pais").value,
          operadora: document.getElementById("u-ph-area").value,
          numero: document.getElementById("u-ph-num").value,
        },
      ],
    },
  };

  try {
    await createUsuarioCombined(payload);
    modal.hide();
    loadData();
  } catch (error) {
    console.error(error);
    alert("Error: " + (error.response?.data?.error || error.message));
  }
}

async function deleteItem(id) {
  if (confirm("¿Seguro de eliminar?")) {
    await deleteResource("usuarios", id);
    loadData();
  }
}

import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo,
  createEmpresaCombined,
} from "../api.js";
import { modal } from "../components/Modal.js";
import {
  getSearchInputHTML,
  setupSearchListener,
  COUNTRY_CODES,
} from "../utils.js";

let allItems = [];
let isAdmin = false;

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;

  container.innerHTML = `
    <div class="header-section">
      <h2>Empresas de Transporte</h2>
      <button id="btn-create" class="btn-primary">Nueva Empresa</button>
    </div>
    ${getSearchInputHTML("search-emp", "Buscar por Nombre o RIF")}
    <div class="table-container">
      <table id="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>RIF</th>
            <th>Ubicación</th>
            ${isAdmin ? "<th>Dirección Exacta</th>" : ""} 
            <th>Teléfono</th>
            ${isAdmin ? "<th>Acciones</th>" : ""}
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-create").onclick = () => showForm();
  loadTable();
}

async function loadTable() {
  const res = await listResource("empresas_transporte");
  allItems = res.data.items || res.data;

  setupSearchListener("search-emp", allItems, renderTable, (item, term) => {
    const rif = item.rif ? `${item.rif.tipo}-${item.rif.numero}` : "";
    return (
      item.nombre.toLowerCase().includes(term) ||
      rif.toLowerCase().includes(term)
    );
  });

  renderTable(allItems);
}

function renderTable(items) {
  const tbody = document.querySelector("#data-table tbody");
  if (!tbody) return; // Validación extra

  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

  try {
    tbody.innerHTML = "";
    items.forEach((e) => {
      const rifStr = e.rif ? `${e.rif.tipo}-${e.rif.numero}` : "N/A";

      // Ubicación General
      const dir = e.direccion || {};
      const ubicacionGeneral = `${dir.estado || ""}, ${dir.municipio || ""}`;

      // Telefono
      let telf = "N/A";
      if (e.telefonos && e.telefonos.length > 0) {
        telf = `${e.telefonos[0].operadora}-${e.telefonos[0].numero}`;
      }

      const tr = document.createElement("tr");

      let html = `
            <td><strong>${e.nombre}</strong></td>
            <td>${rifStr}</td>
            <td>${ubicacionGeneral}</td>
        `;

      if (isAdmin) {
        html += `<td><small>${dir.descripcion || ""}</small></td>`;
      }

      html += `<td>${telf}</td>`;

      if (isAdmin) {
        html += `<td><button class="btn-delete danger" data-id="${e.id}">Eliminar</button></td>`;
      }

      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody.querySelectorAll(".btn-delete").forEach(
        (b) =>
          (b.onclick = async (e) => {
            if (confirm("¿Borrar?")) {
              await deleteResource("empresas_transporte", e.target.dataset.id);
              loadTable(); // <--- CORRECCIÓN: loadTable() en vez de loadData()
            }
          }),
      );
    }
  } catch (e) {
    console.error(e);
  }
}

function showForm() {
  // Generar opciones de pais
  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

  const html = `
    <form id="form-empresa">
      <div class="form-group">
        <label>Nombre de la Empresa</label>
        <input type="text" id="e-nombre" required>
      </div>
      <!-- RIF -->
      <div class="form-group">
        <label>RIF</label>
        <div style="display:flex; gap:10px;">
            <select id="e-rif-tipo" style="width:70px">
                <option value="J">J</option>
                <option value="G">G</option>
                <option value="V">V</option>
            </select>
            <input type="text" id="e-rif-numero" required placeholder="Número RIF" style="flex:1">
        </div>
      </div>
      <!-- Telefono con Select de Pais -->
      <div class="form-group">
            <label>Teléfono</label>
            <div style="display:flex; gap:5px;">
                <select id="e-ph-tipo" style="width:90px">
                    <option value="Trabajo">Trabajo</option>
                    <option value="Celular">Celular</option>
                </select>
                <!-- Select de País -->
                <select id="e-ph-pais" style="width:140px">
                    ${countryOptions}
                </select>
                <input type="text" id="e-ph-area" placeholder="Ej. 0241" style="width:80px">
                <input type="text" id="e-ph-num" placeholder="Número" style="flex:1">
            </div>
      </div>
      <!-- Direccion -->
      <div class="form-group">
        <label>Dirección Fiscal</label>
        <div style="display:grid; width:100%; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:5px;">
            <input type="text" id="e-estado" placeholder="Estado" required>
            <input type="text" id="e-municipio" placeholder="Municipio" required>
            <input type="text" id="e-sector" placeholder="Sector" required style="grid-column: span 2;">
        </div>
        <input type="text" id="e-desc" placeholder="Avenida / Calle / Edificio" required style="width:100%; margin-top:5px;">
      </div>

      <div class="modal-footer">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" id="btn-c">Cancelar</button>
      </div>
    </form>
  `;

  modal.show("Nueva Empresa", html, (box) => {
    box.querySelector("#btn-c").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        nombre: document.getElementById("e-nombre").value,
        rif: {
          tipo: document.getElementById("e-rif-tipo").value,
          numero: document.getElementById("e-rif-numero").value,
        },
        direccion: {
          pais: "Venezuela",
          estado: document.getElementById("e-estado").value,
          municipio: document.getElementById("e-municipio").value,
          sector: document.getElementById("e-sector").value,
          descripcion: document.getElementById("e-desc").value,
        },
        telefonos: [
          {
            tipo: document.getElementById("e-ph-tipo").value,
            codigo_pais: document.getElementById("e-ph-pais").value,
            operadora: document.getElementById("e-ph-area").value,
            numero: document.getElementById("e-ph-num").value,
          },
        ],
      };

      try {
        await createEmpresaCombined(payload);
        modal.hide();
        loadTable(); // <--- CORRECCIÓN: loadTable() en vez de loadData()
      } catch (err) {
        console.error(err);
        alert("Error al guardar empresa");
      }
    };
  });
}

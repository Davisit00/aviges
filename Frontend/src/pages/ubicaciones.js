import {
  listResource,
  deleteResource,
  getUserInfo,
  createUbicacionCombined, // Importar función nueva
  getMetadataEnums, // Importar para los enums
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";

let isAdmin = false;
let allItems = []; // Asegúrate de que esto también esté aquí

// (Se eliminó la función createUbicacionCombined local y el import de axios)

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;

  container.innerHTML = `
    <div class="header-section">
      <h2>Ubicaciones Generales</h2>
      <button id="btn-create" class="btn-primary">Nueva Ubicación</button>
      
    ${getSearchInputHTML("search-ubi", "Nombre, Tipo, Estado...")}
    </div>
    <div class="table-container">
      <table>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Estado / Lugar</th>
                <th>Dirección</th>
                <th>Sector / Detalle</th>
                ${isAdmin ? "<th>Acciones</th>" : ""}
            </tr>
        </thead>
        <tbody id="tbl-body"></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-create").onclick = showCreateForm;
  loadTable();
}

async function loadTable() {
  const tbody = document.getElementById("tbl-body");
  tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

  try {
    const res = await listResource("ubicaciones");
    // Filtro base: no granjas
    const rawItems = res.data.items || res.data;
    allItems = rawItems.filter((u) => u.tipo !== "Granja");

    tbody.innerHTML = "";
    setupSearchListener("search-ubi", allItems, renderTable, [
      "nombre",
      "tipo",
      "direccion.estado",
      "direccion.municipio",
      "direccion.sector",
    ]);

    renderTable(allItems);
  } catch (e) {
    console.error(e);
    tbody.innerHTML = "<tr><td colspan='4'>Error cargando datos</td></tr>";
  }
}

function renderTable(items) {
  const tbody = document.getElementById("tbl-body");

  if (!tbody) {
    console.error("No se encontró el elemento tbody con id 'tbl-body'");
    return;
  }

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">No hay ubicaciones registradas (distintas a Granjas)</td></tr>';
    return;
  }

  const html = items
    .map((u) => {
      // Safe navigation para dirección
      const dir =
        u.direccion ||
        (u.id_direcciones && typeof u.id_direcciones === "object"
          ? u.id_direcciones
          : {});
      const estado = dir.estado || "N/A";
      const municipio = dir.municipio || "N/A";
      const sector = dir.sector || "N/A";
      // Necesitamos saber si es admin, asumimos acceso a variable global isAdmin definida arriba en el archivo
      const btnDel =
        typeof isAdmin !== "undefined" && isAdmin
          ? `<td><button class="btn-delete danger" data-id="${u.id}">Eliminar</button></td>`
          : "";

      return `
                <tr>
                    <td><strong>${u.nombre}</strong></td>
                    <td><span class="badge">${u.tipo}</span></td>
                    <td>${estado}</td>
                    <td>${municipio}</td>
                    <td>${sector}</td>
                    ${btnDel}
                </tr>
            `;
    })
    .join("");

  tbody.innerHTML = html;

  // Reasignar eventos de eliminación
  if (typeof isAdmin !== "undefined" && isAdmin) {
    tbody.querySelectorAll(".btn-delete").forEach(
      (b) =>
        (b.onclick = async (e) => {
          if (confirm("¿Eliminar esta ubicación?")) {
            await deleteResource("ubicaciones", e.target.dataset.id);
            loadTable();
          }
        }),
    );
  }
}

async function showCreateForm() {
  // 1. Obtener Tipos de Ubicación usando la API centralizada
  let tipoOptions = "";
  try {
    const res = await getMetadataEnums(); // Uso de api.js
    const tipos = res.data.ubicaciones_tipo || [];

    // FILTRO CRITICO: Remover 'Granja'
    tipoOptions = tipos
      .filter((t) => t !== "Granja")
      .map((t) => `<option value="${t}">${t}</option>`)
      .join("");
  } catch (e) {
    console.error("Error cargando enums", e);
    tipoOptions =
      '<option value="Almacen">Almacen</option><option value="Cliente">Cliente</option>';
  }

  const html = `
        <form id="f-ubi">
            <div class="form-group">
                <label>Nombre del Lugar</label>
                <input type="text" id="u-nombre" placeholder="Ej. Matadero Principal" required>
            </div>
            <div class="form-group">
                <label>Tipo de Ubicación</label>
                <select id="u-tipo" required>
                    <option value="">Seleccione...</option>
                    ${tipoOptions}
                </select>
                <small style="color:#666">Nota: Las granjas se gestionan en su propio menú.</small>
            </div>
            
            <h4>Dirección</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div class="form-group">
                    <label>Estado</label>
                    <input type="text" id="u-est" required>
                </div>
                <div class="form-group">
                    <label>Municipio</label>
                    <input type="text" id="u-mun" required>
                </div>
            </div>
            <div class="form-group">
                <label>Sector / Detalle</label>
                <input type="text" id="u-sec" required>
            </div>

            <div class="modal-footer">
                <button type="submit" class="btn-primary">Guardar</button>
                <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
            </div>
        </form>
    `;

  modal.show("Registrar Ubicación", html, (box) => {
    box.querySelector("#btn-cancel").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();

      const payload = {
        nombre: document.getElementById("u-nombre").value,
        tipo: document.getElementById("u-tipo").value,
        direccion: {
          pais: "Venezuela",
          estado: document.getElementById("u-est").value,
          municipio: document.getElementById("u-mun").value,
          sector: document.getElementById("u-sec").value,
          descripcion: document.getElementById("u-nombre").value,
        },
      };

      try {
        await createUbicacionCombined(payload); // Uso de api.js
        modal.hide();
        loadTable();
      } catch (err) {
        console.error(err);
        alert("Error: " + (err.response?.data?.error || err.message));
      }
    };
  });
}

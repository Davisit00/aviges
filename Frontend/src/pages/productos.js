import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js"; // <---

let allItems = [];
let isAdmin = false;

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;

  container.innerHTML = `
    <div class="header-section">
      <h2>Productos</h2>
      ${isAdmin ? '<button id="btn-create" class="btn-primary">Nuevo Producto</button>' : ""}
    </div>
    ${getSearchInputHTML("search-prod", "Buscar producto...")}
    <div class="table-container">
       <table id="products-table"><thead><tr><th>Nombre</th><th>Código</th>${isAdmin ? "<th>Acciones</th>" : ""}</tr></thead><tbody></tbody></table>
    </div>
  `;
  if (isAdmin) document.getElementById("btn-create").onclick = showCreateModal;
  loadTable();
}

async function loadTable() {
  const res = await listResource("productos");
  allItems = res.data.items || res.data;
  setupSearchListener("search-prod", allItems, renderTable, [
    "nombre",
    "codigo",
  ]);
  renderTable(allItems);
}

function renderTable(items) {
  const tbody = document.querySelector("#products-table tbody");
  tbody.innerHTML = items
    .map(
      (p) => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.codigo}</td>
            ${isAdmin ? `<td><button class="del-btn danger" data-id="${p.id}">Eliminar</button></td>` : ""}
        </tr>
    `,
    )
    .join("");
  // bind events...
}

function showCreateModal() {
  const formHTML = `
        <form id="form-producto">
            <div class="form-group">
                <label for="prod-nombre">Nombre del Producto</label>
                <input type="text" id="prod-nombre" required placeholder="Ej: Maíz Amarillo">
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn-primary">Guardar</button>
                <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
            </div>
        </form>
    `;

  modal.show("Crear Nuevo Producto", formHTML, (content) => {
    // Callback al cargar el contenido HTML dentro del modal
    const form = content.querySelector("#form-producto");
    const btnCancel = content.querySelector("#btn-cancel");

    btnCancel.onclick = () => modal.hide();

    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = content.querySelector("#prod-nombre").value;
      try {
        // Código temporal, el backend lo genera mejor
        await createResource("productos", { nombre: nombre, codigo: "TEMP" });
        modal.hide();
        loadData();
      } catch (error) {
        alert("Error creando producto: " + error.message);
      }
    };
  });
}

async function handleDelete(id) {
  if (confirm("¿Estás seguro de eliminar este producto?")) {
    await deleteResource("productos", id);
    loadData();
  }
}

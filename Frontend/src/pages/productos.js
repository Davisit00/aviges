import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";

let isAdmin = false;

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;

  container.innerHTML = `
    <div class="header-section">
      <h2>Gestión de Productos</h2>
      <button id="btn-create" class="btn-primary">Nuevo Producto</button>
    </div>
    <div class="table-container">
      <table id="data-table">
          <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                ${isAdmin ? "<th>ID Sist.</th>" : ""}
                ${isAdmin ? "<th>Acciones</th>" : ""}
              </tr>
          </thead>
          <tbody></tbody>
      </table>
    </div>
  `;

  document
    .querySelector("#btn-create")
    .addEventListener("click", showCreateModal);
  loadData();
}

async function loadData() {
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";
  try {
    const res = await listResource("productos");
    const list = res.data.items || res.data;
    tbody.innerHTML = "";

    list.forEach((item) => {
      const tr = document.createElement("tr");

      let html = `
            <td>${item.nombre}</td>
            <td><strong>${item.codigo}</strong></td>
      `;

      if (isAdmin) html += `<td><small>${item.id}</small></td>`;
      if (isAdmin)
        html += `<td><button class="btn-delete danger" data-id="${item.id}">Eliminar</button></td>`;

      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody.querySelectorAll(".btn-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => handleDelete(e.target.dataset.id));
      });
    }
  } catch (e) {
    console.error(e);
  }
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

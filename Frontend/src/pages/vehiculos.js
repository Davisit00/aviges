import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";

let userRole = 2; // Default Operador

export async function init(container) {
  const u = await getUserInfo();
  userRole = u.data.rol.id || u.data.user_rol;
  const isAdmin = userRole === 1;

  container.innerHTML = `
    <div class="header-section">
        <h2>Vehículos</h2>
        <button id="add-btn" class="btn-primary">Registrar Vehículo</button>
    </div>
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Empresa</th>
                    ${isAdmin ? "<th>Fecha Reg.</th>" : ""}
                    ${isAdmin ? "<th>Acciones</th>" : ""}
                </tr>
            </thead>
            <tbody id="v-body"></tbody>
        </table>
    </div>
  `;
  document.getElementById("add-btn").onclick = showCreateModal;
  load();
}

const load = async () => {
  const b = document.getElementById("v-body");
  b.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";
  try {
    const res = await listResource("vehiculos");
    const items = res.data.items || res.data;
    const isAdmin = userRole === 1;

    b.innerHTML = items
      .map((v) => {
        const dateStr = v.created_at
          ? new Date(v.created_at).toLocaleDateString()
          : "-";

        return `
        <tr>
            <td><strong>${v.placa}</strong></td>
            <td>${v.empresa ? v.empresa.nombre : "N/A"}</td>
            ${isAdmin ? `<td><small>${dateStr}</small></td>` : ""}
            ${isAdmin ? `<td><button class="del-btn danger" data-id="${v.id}">Eliminar</button></td>` : ""}
        </tr>`;
      })
      .join("");

    if (isAdmin) {
      document.querySelectorAll(".del-btn").forEach((btn) => {
        btn.onclick = async (e) => {
          if (confirm("Eliminar vehiculo?")) {
            await deleteResource("vehiculos", e.target.dataset.id);
            load();
          }
        };
      });
    }
  } catch (e) {
    b.innerHTML = "<tr><td colspan='4'>Error</td></tr>";
  }
};

const showCreateModal = async () => {
  // Cargamos empresas primero para el select
  const empRes = await listResource("empresas_transporte");
  const empresas = empRes.data.items || empRes.data; // Verificar que esto sea un array

  // CORRECCIÓN: Mapeo correcto con ID
  const options = empresas
    .map((e) => `<option value="${e.id}">${e.nombre}</option>`)
    .join("");

  const formHTML = `
        <form id="form-vehiculo">
            <div class="form-group">
                <label>Placa</label>
                <input type="text" id="v-placa" required>
            </div>
            <div class="form-group">
                <label>Empresa</label>
                <select id="v-empresa" required>
                    <option value="">Seleccione...</option>
                    ${options}
                </select>
            </div>
            <button class="btn-primary" type="submit">Guardar</button>
        </form>
    `;

  modal.show("Nuevo Vehículo", formHTML, (box) => {
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        await createResource("vehiculos", {
          placa: document.getElementById("v-placa").value,
          // CORRECCIÓN: Parseo del ID
          id_empresas_transportes: parseInt(
            document.getElementById("v-empresa").value,
          ),
        });
        modal.hide();
        load();
      } catch (x) {
        alert("Error");
      }
    };
  });
};

import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";

let isAdmin = false;
let globalGranjas = []; // Cache local de granjas

export async function init(container) {
  // 1. Verificar Rol
  try {
    const u = await getUserInfo();
    isAdmin = (u.data.rol.id || u.data.user_rol) === 1;
  } catch (e) {
    console.warn("Error verificando rol", e);
  }

  container.innerHTML = `
    <div class="header-section">
      <h2>Galpones</h2>
      <button id="btn-create" class="btn-primary">Añadir Galpón</button>
    </div>
    
    <!-- Filtro -->
    <div class="filters" style="margin-bottom: 20px; display:flex; gap:10px; align-items:center;">
        <label>Filtrar por Granja:</label>
        <select id="filter-granja" style="width: 250px; padding: 6px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="">Cargando granjas...</option>
        </select>
    </div>

    <div class="table-container">
      <table style="width:100%">
        <thead>
            <tr>
                <th>Granja</th>
                <th>Nro. Galpón</th>
                <th>Capacidad</th>
                ${isAdmin ? "<th>Acciones</th>" : ""}
            </tr>
        </thead>
        <tbody id="tbl-body"></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-create").onclick = () => showCreateModal();

  // Iniciar flujo de carga secuencial
  await loadGranjasAndTable();
}

async function loadGranjasAndTable() {
  const select = document.getElementById("filter-granja");
  if (!select) return;

  // 1. Cargar Granjas
  try {
    const res = await listResource("granjas");
    // Manejo robusto de la respuesta paginada o lista plana
    globalGranjas = res.data.items || res.data;

    select.innerHTML = '<option value="">Todas las Granjas</option>';

    if (Array.isArray(globalGranjas) && globalGranjas.length > 0) {
      globalGranjas.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g.id; // ID de la granja (Root ID del JSON que enviaste)
        // Intentamos mostrar el nombre de la ubicación, si no el ID
        opt.textContent = g.ubicacion?.nombre || `Desc. Granja ${g.id}`;
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">No hay granjas registradas</option>';
    }

    // Asignar evento change una vez cargadas las opciones
    select.onchange = () => loadTable();
  } catch (e) {
    console.error("Error cargando granjas:", e);
    select.innerHTML = '<option value="">Error al cargar lista</option>';
  }

  // 2. Cargar la Tabla de Galpones
  await loadTable();
}

async function loadTable() {
  const tbody = document.getElementById("tbl-body");
  const select = document.getElementById("filter-granja");
  if (!tbody || !select) return;

  const filterId = select.value;

  tbody.innerHTML =
    "<tr><td colspan='4' style='text-align:center'>Cargando datos...</td></tr>";

  try {
    const res = await listResource("galpones");
    let items = res.data.items || res.data;

    // --- APLICAR FILTRO ---
    if (filterId && filterId !== "") {
      items = items.filter((g) => {
        // ESTRATEGIA ROBUSTA:
        // Buscamos el ID en 'id_granjas' (si existe plano)
        // O dentro de 'granja.id' (si viene anidado)
        const gId = g.id_granja || (g.granja ? g.granja.id : null);

        // Usamos == para permitir (string "6" == number 6)
        return gId == filterId;
      });
    }

    if (!items || items.length === 0) {
      tbody.innerHTML =
        "<tr><td colspan='4' style='text-align:center'>No se encontraron galpones</td></tr>";
      return;
    }

    tbody.innerHTML = items
      .map((i) => {
        // Obtener nombre de granja de forma segura
        const nombreGranja = i.granja?.ubicacion?.nombre || "Sin Info";

        let actionBtn = "";
        if (isAdmin) {
          actionBtn = `<td><button class="del-btn danger" data-id="${i.id}">Eliminar</button></td>`;
        }

        return `
                <tr>
                    <td>${nombreGranja}</td>
                    <td><strong>Galpón ${i.nro_galpon}</strong></td>
                    <td>${i.capacidad} aves</td>
                    ${actionBtn}
                </tr>
            `;
      })
      .join("");

    if (isAdmin) {
      tbody.querySelectorAll(".del-btn").forEach(
        (b) =>
          (b.onclick = async (e) => {
            if (confirm("¿Estás seguro de borrar este galpón?")) {
              try {
                await deleteResource("galpones", e.target.dataset.id);
                loadTable();
              } catch (err) {
                alert("Error al eliminar");
                console.error(err);
              }
            }
          }),
      );
    }
  } catch (e) {
    console.error("Error cargando galpones:", e);
    tbody.innerHTML = "<tr><td colspan='4'>Error al obtener datos</td></tr>";
  }
}

function showCreateModal() {
  if (globalGranjas.length === 0) {
    alert("Primero debe registrar al menos una Granja.");
    return;
  }

  // Datalist options
  const dlOpts = globalGranjas
    .map((g) => `<option value="${g.ubicacion?.nombre} [ID:${g.id}]"></option>`)
    .join("");

  const html = `
        <form id="f-galpon">
            <div class="form-group">
                <label>Granja</label>
                <input list="dl-granjas-g" id="fg-granja-input" placeholder="Buscar granja..." required style="width:100%">
                <datalist id="dl-granjas-g">${dlOpts}</datalist>
                <input type="hidden" id="fg-granja-hidden">
            </div>
            <div class="form-group">
                <label>Número Identificador Galpón</label>
                <input type="number" id="fg-nro" required placeholder="Ej. 1" min="1">
            </div>
            <div class="form-group">
                <label>Capacidad Aves</label>
                <input type="number" id="fg-cap" required placeholder="Ej. 5000" min="1">
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn-primary">Guardar</button>
                <button type="button" class="btn-secondary" id="btn-c">Cancelar</button>
            </div>
        </form>
    `;

  modal.show("Nuevo Galpón", html, (box) => {
    // Lógica Datalist
    const inputG = box.querySelector("#fg-granja-input");
    inputG.onchange = () => {
      const val = inputG.value;
      const match = globalGranjas.find(
        (g) => `${g.ubicacion?.nombre} [ID:${g.id}]` === val,
      );
      document.getElementById("fg-granja-hidden").value = match ? match.id : "";
    };

    box.querySelector("#btn-c").onclick = () => modal.hide();

    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const gId = document.getElementById("fg-granja-hidden").value;
      if (!gId) {
        alert("Seleccione una granja válida de la lista.");
        return;
      }

      const p = {
        id_granja: Number(gId), // Corregido key según backend models.py (id_granjas)
        nro_galpon: parseInt(box.querySelector("#fg-nro").value),
        capacidad: parseInt(box.querySelector("#fg-cap").value),
      };
      try {
        await createResource("galpones", p);
        modal.hide();
        loadTable();
      } catch (e) {
        console.error(e);
        alert("Error al guardar: " + (e.response?.data?.error || e.message));
      }
    };
  });
}

import {
  listResource,
  createLoteCombined,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";

let allItems = []; // <--- CORRECCIÓN 1: Agregar variable global
let isAdmin = false;

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;

  container.innerHTML = `
        <div class="header-section">
            <h2>Lotes de Aves</h2>
            <button id="btn-add" class="btn-primary">Registrar Lote</button>
            
        ${getSearchInputHTML("search-lote", "Código Lote, Granja, Galpón...")}
        </div>
        <!-- Filtro por Granja -->
        <div class="filters" style="margin-bottom: 15px; display:flex; gap:10px; align-items:center;">
            <label>Filtrar por Granja:</label>
            <select id="filter-granja" style="width: 250px; padding: 5px;">
                <option value="">Cargando granjas...</option>
            </select>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        ${isAdmin ? "<th>ID</th>" : ""}
                        <th>Código</th>
                        <th>Ubicación (Galpón - Granja)</th>
                        <th>Fecha Alojamiento</th>
                        <th>Cant. Aves</th>
                        ${isAdmin ? "<th>Acción</th>" : ""}
                    </tr>
                </thead>
                <tbody id="l-body"></tbody>
            </table>
        </div>
    `;

  document.getElementById("btn-add").onclick = showCreateForm;

  // Lógica secuencial: Primero filtros, luego datos
  await loadFiltersAndData();
}

async function loadFiltersAndData() {
  const selectFilter = document.getElementById("filter-granja");

  // 1. Cargar Granjas
  try {
    const res = await listResource("granjas");
    const granjas = res.data.items || res.data;

    selectFilter.innerHTML = '<option value="">Todas las Granjas</option>';
    granjas.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.ubicacion?.nombre || `Granja #${g.id}`;
      selectFilter.appendChild(opt);
    });

    // Activar evento solo después de cargar
    selectFilter.onchange = () => loadTable();
  } catch (e) {
    console.error("Error cargando filtro granjas", e);
    selectFilter.innerHTML = '<option value="">Error al cargar</option>';
  }

  // 2. Cargar Tabla Inicial
  loadTable();
}

async function loadTable() {
  const tbody = document.getElementById("l-body");
  if (!tbody) return; // Seguridad si cambiamos de vista rapido

  const filterId = document.getElementById("filter-granja").value;

  tbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';

  try {
    const res = await listResource("lotes");
    allItems = res.data.items || res.data;

    // --- APLICAR FILTRO ---
    // Convertimos a string para asegurar compatibilidad estricta
    if (filterId && filterId !== "") {
      allItems = allItems.filter((l) => {
        // Navegar con seguridad: lote -> galpon -> granja -> id
        const granjaId = l.galpon?.granja?.id || l.galpon?.id_granjas;
        return granjaId == filterId;
      });
    }

    if (allItems.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">No se encontraron registros</td></tr>';
      return;
    }

    setupSearchListener("search-lote", allItems, renderTable, [
      "codigo_lote",
      "galpon.granja.ubicacion.nombre",
      "galpon.nro_galpon",
    ]);

    renderTable(allItems);

    if (isAdmin) {
      tbody.querySelectorAll(".btn-delete").forEach(
        (b) =>
          (b.onclick = async (e) => {
            if (confirm("¿Eliminar lote?")) {
              await deleteResource("lotes", e.target.dataset.id);
              loadTable();
            }
          }),
      );
    }
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="6">Error de conexión</td></tr>';
  }
}

// <--- CORRECCIÓN 2: AGREGAR ESTA FUNCIÓN FALTANTE
function renderTable(items) {
  const tbody = document.getElementById("l-body");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center;">No se encontraron registros</td></tr>';
    return;
  }

  tbody.innerHTML = items
    .map((l) => {
      const galpon = l.galpon || {};
      const granjaName = galpon.granja?.ubicacion?.nombre || "N/A";
      const ubicacionStr = `Galpón ${galpon.nro_galpon || "?"} - ${granjaName}`;
      const fecha = l.fecha_alojamiento
        ? new Date(l.fecha_alojamiento).toLocaleDateString()
        : "N/A";

      let html = "";
      if (isAdmin) html += `<td>${l.id}</td>`;
      html += `
            <td><strong>${l.codigo_lote}</strong></td>
            <td>${ubicacionStr}</td>
            <td>${fecha}</td>
            <td>${l.cantidad_aves}</td>
        `;
      if (isAdmin) {
        html += `<td><button class="btn-delete danger" data-id="${l.id}">Eliminar</button></td>`;
      }
      return `<tr>${html}</tr>`;
    })
    .join("");

  // Reasignar eventos (debe estar dentro de renderTable para que funcione con el buscador)
  if (isAdmin) {
    tbody.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.onclick = async (e) => {
        if (confirm("¿Eliminar lote?")) {
          await deleteResource("lotes", e.target.dataset.id);
          loadTable();
        }
      };
    });
  }
}

async function showCreateForm() {
  let granjas = [];
  let galpones = [];
  let granjaOptions = '<option value="">Cargando...</option>';

  // 1. Cargar Granjas y Galpones
  try {
    const [resGranjas, resGalpones] = await Promise.all([
      listResource("granjas"),
      listResource("galpones"),
    ]);

    granjas = resGranjas.data.items || resGranjas.data;
    galpones = resGalpones.data.items || resGalpones.data;

    // Crear opciones para el select de GRANJAS
    if (granjas.length > 0) {
      granjaOptions =
        '<option value="">Seleccione Granja...</option>' +
        granjas
          .map(
            (g) =>
              `<option value="${g.id}">${g.ubicacion?.nombre || "Granja " + g.id}</option>`,
          )
          .join("");
    } else {
      granjaOptions = '<option value="">No hay granjas</option>';
    }
  } catch (e) {
    console.error(e);
    alert("Error cargando datos para el formulario");
    return;
  }

  // Formateador
  const formatGranja = (g) => `${g.ubicacion?.nombre || "Granja " + g.id}`; // Sin ID visible, solo nombre

  const dlGranjas = granjas
    .map((g) => {
      const nombre = g.ubicacion?.nombre || "Granja " + g.id;
      return `<option value="${nombre}"></option>`;
    })
    .join("");

  const html = `
        <form id="f-lote">
            <div class="form-group">
                <label>Código del Lote</label>
                <input type="text" id="l-codigo" placeholder="Ej. L-2024-01" required>
            </div>
            
            <!-- BUSCADOR GRANJA -->
            <div class="form-group">
                <label>Filtrar Galpones por Granja (Buscar)</label>
                <input list="dl-l-granjas" id="l-granja-input" placeholder="Escriba nombre de granja..." style="width:100%">
                <datalist id="dl-l-granjas">${dlGranjas}</datalist>
                <input type="hidden" id="l-granja-id">
            </div>

            <div class="form-group">
                <label>Galpón de Destino</label>
                <!-- Este se mantiene como SELECT porque se filtra dinámicamente y suelen ser pocos por granja -->
                <select id="l-galpon" required disabled style="background-color:#eee">
                    <option value="">Seleccione Granja primero...</option>
                </select>
            </div>
            
            <!-- Resto de campos fecha y cantidad -->
            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div><label>Fecha Alojamiento</label><input type="date" id="l-fecha" required></div>
                <div><label>Cant. Aves</label><input type="number" id="l-cantidad" required></div>
            </div>

            <div class="modal-footer">
                <button type="submit" class="btn-primary">Registrar</button>
                <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
            </div>
        </form>
    `;

  modal.show("Registrar Nuevo Lote", html, (box) => {
    const inputGranja = box.querySelector("#l-granja-input");
    const selectGalpon = box.querySelector("#l-galpon");

    // Evento Change del Input Buscador
    inputGranja.onchange = () => {
      const val = inputGranja.value;
      const match = granjas.find((g) => formatGranja(g) === val); // Match con nombre limpio
      selectGalpon.innerHTML = '<option value="">Seleccione Galpón...</option>';
      selectGalpon.disabled = true;
      selectGalpon.style.backgroundColor = "#eee";

      if (match) {
        const granjaId = match.id;
        // Filtrar y activar
        const misGalpones = galpones.filter((g) => {
          const gId = g.id_granjas || (g.granja ? g.granja.id : null);
          return gId == granjaId;
        });

        if (misGalpones.length > 0) {
          selectGalpon.disabled = false;
          selectGalpon.style.backgroundColor = "#fff";
          selectGalpon.innerHTML += misGalpones
            .map(
              (g) =>
                `<option value="${g.id}">Galpón #${g.nro_galpon} (${g.capacidad})</option>`,
            )
            .join("");
          // Auto focus al select para fluidez
          selectGalpon.focus();
        } else {
          selectGalpon.innerHTML =
            "<option>No hay galpones en esta granja</option>";
        }
      }
    };

    box.querySelector("#btn-cancel").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      // Validar galpon
      if (!selectGalpon.value) {
        alert("Selecciona un galpón");
        return;
      }

      const payload = {
        codigo_lote: document.getElementById("l-codigo").value,
        id_galpones: parseInt(selectGalpon.value), // Valor final
        fecha_alojamiento: document.getElementById("l-fecha").value,
        cantidad_aves: parseInt(document.getElementById("l-cantidad").value),
      };
      try {
        await createLoteCombined(payload);
        modal.hide();
        loadTable(); // Usar loadTable en lugar de load() que no existe
      } catch (err) {
        alert(
          "Error al crear lote: " + (err.response?.data?.error || err.message),
        );
      }
    };
  });
}

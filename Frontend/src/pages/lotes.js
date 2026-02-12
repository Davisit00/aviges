import {
  listResource,
  createLoteCombined,
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
            <h2>Lotes de Aves</h2>
            <button id="btn-add" class="btn-primary">Registrar Lote</button>
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
                        <th>Galpón</th>
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
    let items = res.data.items || res.data;

    // --- APLICAR FILTRO ---
    // Convertimos a string para asegurar compatibilidad estricta
    if (filterId && filterId !== "") {
      items = items.filter((l) => {
        // Navegar con seguridad: lote -> galpon -> granja -> id
        const granjaId = l.galpon?.granja?.id || l.galpon?.id_granjas;
        return granjaId == filterId;
      });
    }

    if (items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">No se encontraron registros</td></tr>';
      return;
    }

    tbody.innerHTML = items
      .map((l) => {
        const nroGalpon = l.galpon ? l.galpon.nro_galpon : "S/D";
        const nombreGranja =
          l.galpon && l.galpon.granja && l.galpon.granja.ubicacion
            ? l.galpon.granja.ubicacion.nombre
            : "Desconocida";

        let fechaStr = "-";
        if (l.fecha_alojamiento) {
          // Manejo de zona horaria simple
          fechaStr = new Date(l.fecha_alojamiento).toISOString().split("T")[0];
        }

        const btnDelete = isAdmin
          ? `<td><button class="btn-delete danger" data-id="${l.id}">Eliminar</button></td>`
          : "";

        return `
            <tr>
                ${isAdmin ? `<td><small>#${l.id}</small></td>` : ""}
                <td><strong>${l.codigo_lote}</strong></td>
                <td>Galpón ${nroGalpon} <small style="color:#666">(${nombreGranja})</small></td>
                <td>${fechaStr}</td>
                <td>${l.cantidad_aves}</td>
                ${btnDelete}
            </tr>`;
      })
      .join("");

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

  const html = `
        <form id="f-lote">
            <div class="form-group">
                <label>Código del Lote</label>
                <input type="text" id="l-codigo" placeholder="Ej. L-2024-01" required>
            </div>
            
            <!-- NUEVO: Filtro de Granja -->
            <div class="form-group">
                <label>Filtrar Galpones por Granja (Opcional)</label>
                <select id="l-granja-filter" style="width:100%; margin-bottom:5px;">
                    ${granjaOptions}
                </select>
            </div>

            <div class="form-group">
                <label>Galpón de Destino</label>
                <select id="l-galpon" required disabled style="background-color:#eee">
                    <option value="">Primero seleccione una granja</option>
                </select>
            </div>

            <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label>Fecha Alojamiento</label>
                    <input type="date" id="l-fecha" required>
                </div>
                <div>
                    <label>Cantidad Inicial Aves</label>
                    <input type="number" id="l-cantidad" min="1" placeholder="0" required>
                </div>
            </div>

            <div class="modal-footer">
                <button type="submit" class="btn-primary">Registrar</button>
                <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
            </div>
        </form>
    `;

  modal.show("Registrar Nuevo Lote", html, (box) => {
    const selectGranja = box.querySelector("#l-granja-filter");
    const selectGalpon = box.querySelector("#l-galpon");

    // Lógica para filtrar galpones al cambiar granja
    selectGranja.onchange = () => {
      const granjaId = selectGranja.value;
      selectGalpon.innerHTML = '<option value="">Seleccione Galpón...</option>';
      selectGalpon.disabled = false;
      selectGalpon.style.backgroundColor = "";

      if (!granjaId) {
        selectGalpon.innerHTML =
          '<option value="">Primero seleccione una granja</option>';
        selectGalpon.disabled = true;
        return;
      }

      // Filtrar galpones en memoria
      const galponesFiltrados = galpones.filter((g) => {
        const gId = g.id_granjas || (g.granja ? g.granja.id : null);
        return gId == granjaId;
      });

      if (galponesFiltrados.length > 0) {
        selectGalpon.innerHTML += galponesFiltrados
          .map(
            (g) =>
              `<option value="${g.id}">Galpón #${g.nro_galpon} (Cap: ${g.capacidad})</option>`,
          )
          .join("");
      } else {
        selectGalpon.innerHTML =
          '<option value="">Sin galpones registrados en esta granja</option>';
      }
    };

    box.querySelector("#btn-cancel").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      const payload = {
        codigo_lote: document.getElementById("l-codigo").value,
        id_galpones: parseInt(document.getElementById("l-galpon").value),
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

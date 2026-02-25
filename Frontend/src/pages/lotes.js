import {
  listResource,
  createLoteCombined,
  deleteResource,
  getUserInfo,
  createResource, // Para crear galpón
  createGranjaCombined, // Para crear granja
} from "../api.js";
import { modal } from "../components/Modal.js";
import {
  getSearchInputHTML,
  setupSearchListener,
  COUNTRY_CODES,
} from "../utils.js";

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
  const formatGranja = (g) => `${g.ubicacion?.nombre || "Granja " + g.id}`;

  const dlGranjas = granjas
    .map((g) => {
      const nombre = g.ubicacion?.nombre || "Granja " + g.id;
      return `<option value="${nombre}"></option>`;
    })
    .join("");

  // Campos para crear granja
  const countryOptions = (COUNTRY_CODES || [])
    .map(
      (c) =>
        `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
    )
    .join("");

  const granjaFormHTML = `
    <div id="section-new-granja" style="display:none; background:#f0f8ff; padding:15px; gap:15px; flex-direction:column; margin-top:5px; border:1px solid #cce5ff; border-radius:5px; position:relative;">
      <span id="btn-close-new-granja" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;">&times;</span>
      <h5 style="margin:0 0 10px 0; color:#003B73;">Nueva Granja</h5>
      <div class="form-group">
        <label>Nombre de la Granja</label>
        <input type="text" id="g-nombre" placeholder="Ej. La Providencia">
      </div>
      <div class="form-group">
        <label>RIF</label>
        <div style="display:flex; gap:10px;">
          <select id="g-rif-tipo" style="width:70px"><option value="J">J</option><option value="G">G</option></select>
          <input type="text" id="g-rif-num" style="flex:1">
        </div>
      </div>
      <div class="form-group">
        <label>Teléfono de la Granja</label>
        <div style="display:flex; gap:5px;">
          <select id="g-ph-tipo" style="width:90px"><option value="Casa">Casa</option><option value="Trabajo">Trabajo</option></select>
          <select id="g-ph-pais" style="width:140px">${countryOptions}</select>
          <input type="text" id="g-ph-area" placeholder="0241" style="width:80px">
          <input type="text" id="g-ph-num" placeholder="Número" style="flex:1">
        </div>
      </div>
      <div class="form-group">
        <label>Dirección</label>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
          <input type="text" id="g-est" placeholder="Estado">
          <input type="text" id="g-mun" placeholder="Municipio">
          <input type="text" id="g-sec" placeholder="Sector" style="grid-column: span 2;">
        </div>
        <input type="text" id="g-desc" placeholder="Descripción (Ej. Cerca del río...)" style="width:100%; margin-top:10px;">
      </div>
      <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">
      <h4>Datos del Responsable</h4>
      <div class="form-group">
        <div style="display:flex; gap:10px; margin-bottom: 10px;">
          <select id="resp-tipo-cedula" style="width:70px"><option value="V">V</option><option value="E">E</option></select>
          <input type="text" id="resp-cedula" placeholder="Cédula" style="flex:1;">
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <input type="text" id="resp-nombre" placeholder="Nombre">
          <input type="text" id="resp-apellido" placeholder="Apellido">
        </div>
      </div>
    </div>
  `;

  // Campos para crear galpón
  const galponFormHTML = `
    <div id="section-new-galpon" style="display:none; background:#f9f9f9; padding:15px; gap:15px; flex-direction:column; margin-top:5px; border:1px solid #e0e0e0; border-radius:5px; position:relative;">
      <span id="btn-close-new-galpon" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;">&times;</span>
      <h5 style="margin:0 0 10px 0; color:#003B73;">Nuevo Galpón</h5>
      <div class="form-group">
        <label>Número Identificador Galpón</label>
        <input type="number" id="fg-nro" placeholder="Ej. 1" min="1">
      </div>
      <div class="form-group">
        <label>Capacidad Aves</label>
        <input type="number" id="fg-cap" placeholder="Ej. 5000" min="1">
      </div>
    </div>
  `;

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
                <div style="margin-top:5px; text-align:right;">
                  <span id="btn-toggle-new-granja" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
                    Registrar nueva granja
                  </span>
                </div>
            </div>
            ${granjaFormHTML}

            <div class="form-group" style="margin-top:20px;">
                <label>Galpón de Destino</label>
                <select id="l-galpon" required disabled style="background-color:#eee">
                    <option value="">Seleccione Granja primero...</option>
                </select>
                <div style="margin-top:5px; text-align:right;">
                  <span id="btn-toggle-new-galpon" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
                    Registrar nuevo galpón
                  </span>
                </div>
            </div>
            ${galponFormHTML}
            
            <!-- Resto de campos fecha y cantidad -->
            <div class="form-group" style="margin-top:20px; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
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
    const inpGranjaId = box.querySelector("#l-granja-id");

    // --- NUEVO: Toggle granja ---
    const btnShowGranja = box.querySelector("#btn-toggle-new-granja");
    const btnHideGranja = box.querySelector("#btn-close-new-granja");
    const secNewGranja = box.querySelector("#section-new-granja");
    let isNewGranjaMode = false;

    btnShowGranja.onclick = () => {
      secNewGranja.style.display = "flex";
      inputGranja.required = false;
      inputGranja.value = "";
      inpGranjaId.value = "";
      isNewGranjaMode = true;
      // Al abrir nueva granja, deshabilitar galpón y limpiar
      selectGalpon.innerHTML =
        '<option value="">Seleccione Granja primero...</option>';
      selectGalpon.disabled = true;
      selectGalpon.style.backgroundColor = "#eee";
    };
    btnHideGranja.onclick = () => {
      secNewGranja.style.display = "none";
      inputGranja.required = true;
      isNewGranjaMode = false;
    };

    // --- NUEVO: Toggle galpón ---
    const btnShowGalpon = box.querySelector("#btn-toggle-new-galpon");
    const btnHideGalpon = box.querySelector("#btn-close-new-galpon");
    const secNewGalpon = box.querySelector("#section-new-galpon");
    let isNewGalponMode = false;

    btnShowGalpon.onclick = () => {
      secNewGalpon.style.display = "flex";
      selectGalpon.required = false;
      selectGalpon.value = "";
      isNewGalponMode = true;
    };
    btnHideGalpon.onclick = () => {
      secNewGalpon.style.display = "none";
      selectGalpon.required = true;
      isNewGalponMode = false;
    };

    // Evento Change del Input Buscador
    inputGranja.onchange = () => {
      const val = inputGranja.value;
      const match = granjas.find((g) => formatGranja(g) === val);
      inpGranjaId.value = match ? match.id : "";
      selectGalpon.innerHTML = '<option value="">Seleccione Galpón...</option>';
      selectGalpon.disabled = true;
      selectGalpon.style.backgroundColor = "#eee";
      if (match) {
        const granjaId = match.id;
        // Filtrar y activar
        const misGalpones = galpones.filter((g) => {
          const gId = g.id_granja || (g.granja ? g.granja.id : null);
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

      let granjaId = inpGranjaId.value;
      let galponId = selectGalpon.value;

      // Si está en modo nueva granja, crearla antes de continuar
      if (isNewGranjaMode) {
        const payload = {
          ubicacion: {
            nombre: box.querySelector("#g-nombre").value,
            direccion: {
              pais: "Venezuela",
              estado: box.querySelector("#g-est").value,
              municipio: box.querySelector("#g-mun").value,
              sector: box.querySelector("#g-sec").value,
              descripcion: box.querySelector("#g-desc").value,
            },
          },
          rif: {
            tipo: box.querySelector("#g-rif-tipo").value,
            numero: box.querySelector("#g-rif-num").value,
          },
          persona: {
            cedula: box.querySelector("#resp-cedula").value,
            tipo_cedula: box.querySelector("#resp-tipo-cedula").value,
            nombre: box.querySelector("#resp-nombre").value,
            apellido: box.querySelector("#resp-apellido").value,
            direccion: {
              estado: "N/A",
              municipio: "N/A",
              sector: "N/A",
              pais: "Venezuela",
            },
          },
          telefonos: [
            {
              tipo: box.querySelector("#g-ph-tipo").value,
              codigo_pais: box.querySelector("#g-ph-pais").value,
              operadora: box.querySelector("#g-ph-area").value,
              numero: box.querySelector("#g-ph-num").value,
            },
          ],
        };
        try {
          const res = await createGranjaCombined(payload);
          // Recargar granjas y galpones
          const [resGranjas, resGalpones] = await Promise.all([
            listResource("granjas"),
            listResource("galpones"),
          ]);
          granjas = resGranjas.data.items || resGranjas.data;
          galpones = resGalpones.data.items || resGalpones.data;
          const nueva = res.data.granja || res.data;
          granjaId = nueva.id;
          inputGranja.value = `${nueva.ubicacion?.nombre}`;
          inpGranjaId.value = nueva.id;
          secNewGranja.style.display = "none";
          inputGranja.required = true;
          isNewGranjaMode = false;
          alert("Granja registrada exitosamente.");
        } catch (x) {
          console.error(x);
          alert(
            "Error al crear granja: " + (x.response?.data?.error || x.message),
          );
          return;
        }
      }

      // Si está en modo nuevo galpón, crearlo antes de continuar
      if (isNewGalponMode) {
        if (!granjaId) {
          alert("Debe seleccionar o crear una granja primero.");
          return;
        }
        const payload = {
          id_granja: Number(granjaId),
          nro_galpon: parseInt(box.querySelector("#fg-nro").value),
          capacidad: parseInt(box.querySelector("#fg-cap").value),
        };
        try {
          const res = await createResource("galpones", payload);
          // Recargar galpones
          const resGalpones = await listResource("galpones");
          galpones = resGalpones.data.items || resGalpones.data;
          const nuevoGalpon = res.data.galpon || res.data;
          galponId = nuevoGalpon.id;
          selectGalpon.innerHTML = `<option value="${galponId}">Galpón #${nuevoGalpon.nro_galpon} (${nuevoGalpon.capacidad})</option>`;
          selectGalpon.value = galponId;
          selectGalpon.disabled = false;
          selectGalpon.style.backgroundColor = "#fff";
          secNewGalpon.style.display = "none";
          selectGalpon.required = true;
          isNewGalponMode = false;
          alert("Galpón registrado exitosamente.");
        } catch (x) {
          console.error(x);
          alert(
            "Error al crear galpón: " + (x.response?.data?.error || x.message),
          );
          return;
        }
      }

      // Validar galpón
      if (!selectGalpon.value) {
        alert("Selecciona un galpón");
        return;
      }

      const payload = {
        codigo_lote: box.querySelector("#l-codigo").value,
        id_galpones: parseInt(selectGalpon.value),
        fecha_alojamiento: box.querySelector("#l-fecha").value,
        cantidad_aves: parseInt(box.querySelector("#l-cantidad").value),
      };
      try {
        await createLoteCombined(payload);
        modal.hide();
        loadTable();
      } catch (err) {
        alert(
          "Error al crear lote: " + (err.response?.data?.error || err.message),
        );
      }
    };
  });
}

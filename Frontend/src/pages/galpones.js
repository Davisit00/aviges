import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
  createGranjaCombined, // <--- Importar función de creación de granja
} from "../api.js";
import { modal } from "../components/Modal.js";
import { COUNTRY_CODES } from "../utils.js"; // <--- Importar códigos de país

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
    // Pero ahora permitiremos registrar desde aquí
    // return; // Eliminar este return
  }

  // Datalist options
  const dlOpts = globalGranjas
    .map((g) => `<option value="${g.ubicacion?.nombre} [ID:${g.id}]"></option>`)
    .join("");

  // Campos para crear granja (similar a granjas.js)
  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

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

  const html = `
    <form id="f-galpon">
      <div class="form-group">
        <label>Granja</label>
        <input list="dl-granjas-g" id="fg-granja-input" placeholder="Buscar granja..." required style="width:100%">
        <datalist id="dl-granjas-g">${dlOpts}</datalist>
        <input type="hidden" id="fg-granja-hidden">
        <div style="margin-top:5px; text-align:right;">
          <span id="btn-toggle-new-granja" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
            Registrar nueva granja
          </span>
        </div>
      </div>
      ${granjaFormHTML}
      <div class="form-group" style="margin-top:20px;">
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

    // Toggle granja form
    const btnShow = box.querySelector("#btn-toggle-new-granja");
    const btnHide = box.querySelector("#btn-close-new-granja");
    const secNew = box.querySelector("#section-new-granja");
    const inpSearch = box.querySelector("#fg-granja-input");

    let isNewGranjaMode = false;

    btnShow.onclick = () => {
      secNew.style.display = "flex";
      inpSearch.required = false;
      inpSearch.value = "";
      document.getElementById("fg-granja-hidden").value = "";
      isNewGranjaMode = true;
    };
    btnHide.onclick = () => {
      secNew.style.display = "none";
      inpSearch.required = true;
      isNewGranjaMode = false;
    };

    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();

      let gId = document.getElementById("fg-granja-hidden").value;

      // Si está en modo nueva granja, crearla antes de crear el galpón
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
          await loadGranjasAndTable();
          const nueva = res.data.granja || res.data;
          gId = nueva.id;
          inpSearch.value = `${nueva.ubicacion?.nombre} [ID:${nueva.id}]`;
          document.getElementById("fg-granja-hidden").value = nueva.id;
          secNew.style.display = "none";
          inpSearch.required = true;
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

      if (!gId) {
        alert("Seleccione una granja válida de la lista o registre una nueva.");
        return;
      }

      const p = {
        id_granja: Number(gId),
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

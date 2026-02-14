import {
  listResource,
  createResource,
  deleteResource,
  getUserInfo,
  createEmpresaCombined,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";

let allItems = [];
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
    ${getSearchInputHTML("search-veh", "Placa o Empresa...")}
    <div class="table-container">
        <!-- Agregamos ID a la tabla para consistencia, aunque usaremos el ID del tbody -->
        <table id="vehiculos-table">
            <thead>
                <tr>
                    <th>Placa</th>
                    <th>Empresa</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody id="v-body"></tbody>
        </table>
    </div>
  `;
  document.getElementById("add-btn").onclick = showCreateModal;
  loadData();
}

const loadData = async () => {
  try {
    const res = await listResource("vehiculos");
    allItems = res.data.items || res.data;

    setupSearchListener("search-veh", allItems, renderTable, [
      "placa",
      "empresa.nombre",
    ]);

    renderTable(allItems);
  } catch (err) {
    console.error("Error loading data:", err);
  }
};

function renderTable(items) {
  // CORRECCIÓN 1: Usar getElementById con el ID correcto definido en init ('v-body')
  const tbody = document.getElementById("v-body");
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='3' style='text-align:center'>No hay registros</td></tr>";
    return;
  }

  const isAdmin = userRole === 1;

  tbody.innerHTML = items
    .map((v) => {
      const empName = v.empresa ? v.empresa.nombre : "N/A";

      return `
        <tr>
            <td>${v.placa}</td>
            <td>${empName}</td>
            <td>
             ${isAdmin ? `<button class="btn-delete danger" data-id="${v.id}">Eliminar</button>` : "-"}
            </td>
        </tr>`;
    })
    .join("");

  if (isAdmin) {
    tbody.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.onclick = async (e) => {
        if (confirm("¿Eliminar vehículo?")) {
          await deleteResource("vehiculos", e.target.dataset.id);
          loadData(); // CORRECCIÓN 2: Llamar a loadData() en lugar de load()
        }
      };
    });
  }
}

const showCreateModal = async () => {
  let empresas = [];
  try {
    const res = await listResource("empresas_transporte");
    empresas = res.data.items || res.data;
  } catch (e) {
    console.error(e);
  }

  const formatEmpresa = (e) => {
    const rifStr = e.rif ? `${e.rif.tipo}-${e.rif.numero}` : "S/R";
    return `${e.nombre} (${rifStr})`;
  };

  const datalistOpts = empresas
    .map((e) => `<option value="${formatEmpresa(e)}"></option>`)
    .join("");

  // Helper operadoras
  const opOptions = `<option value="0412">0412</option><option value="0414">0414</option><option value="0424">0424</option><option value="0212">0212</option>`;

  const formHTML = `
        <form id="form-vehiculo">
            <div class="form-group">
                <label>Placa del Vehículo</label>
                <input type="text" id="v-placa" required placeholder="AAA-000" maxlength="10">
            </div>

            <div class="form-group">
                <label>Empresa Propietaria</label>
                
                <!-- SECCION BÚSQUEDA -->
                <div id="section-search">
                    <input list="dl-empresas" id="v-empresa-input" placeholder="Buscar por Nombre o RIF..." style="width:100%">
                    <datalist id="dl-empresas">${datalistOpts}</datalist>
                    <input type="hidden" id="v-empresa-id">
                    
                    <div style="margin-top:5px; text-align:right;">
                        <span id="btn-toggle-new" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
                            ¿No existe? Registrar nueva empresa
                        </span>
                    </div>
                </div>

                <!-- SECCION CREACIÓN (Oculta por defecto) -->
                <div id="section-new" style="display:none; background:#f0f8ff; padding:15px; border:1px solid #cce5ff; border-radius:5px; margin-top:5px; position:relative;">
                    <!-- Botón Cerrar (X) -->
                    <span id="btn-close-new" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;" title="Cancelar creación">&times;</span>
                    
                    <h5 style="margin:0 0 10px 0; color:#003B73;">Nueva Empresa</h5>
                    
                    <div class="form-group">
                        <input type="text" id="new-e-nombre" placeholder="Nombre Fiscal">
                    </div>
                    <div class="form-group" style="display:grid; grid-template-columns: 80px 1fr; gap:5px;">
                        <select id="new-e-rif-tipo"><option value="J">J</option><option value="G">G</option></select>
                        <input type="number" id="new-e-rif-nro" placeholder="RIF">
                    </div>
                    <div class="form-group" style="display:grid; grid-template-columns: 100px 1fr; gap:5px;">
                        <label style="grid-column: span 2; font-size:0.9em;">Teléfono</label>
                        <select id="new-e-telf-op">${opOptions}</select>
                        <input type="number" id="new-e-telf-num" placeholder="1234567">
                    </div>
                </div>
            </div>

            <div class="modal-footer">
                <button class="btn-primary" type="submit">Guardar</button>
            </div>
        </form>
    `;

  modal.show("Nuevo Vehículo", formHTML, (box) => {
    const btnShowNew = box.querySelector("#btn-toggle-new");
    const btnHideNew = box.querySelector("#btn-close-new");

    const sectionSearch = box.querySelector("#section-search");
    const sectionNew = box.querySelector("#section-new");
    const inputSearch = box.querySelector("#v-empresa-input");

    // Estado interno
    let isCreatingNew = false;

    // Función para cambiar visibilidad
    const toggleMode = (createMode) => {
      isCreatingNew = createMode;
      if (createMode) {
        // Mostrar formulario nueva empresa
        sectionSearch.style.display = "none";
        sectionNew.style.display = "block";

        // Ajustar 'required'
        inputSearch.required = false;
        box.querySelector("#new-e-nombre").required = true;
        box.querySelector("#new-e-rif-nro").required = true;
        box.querySelector("#new-e-telf-num").required = true;

        // Limpiar busqueda
        inputSearch.value = "";
      } else {
        // Mostrar buscador
        sectionSearch.style.display = "block";
        sectionNew.style.display = "none";

        // Ajustar 'required'
        inputSearch.required = true;
        box.querySelector("#new-e-nombre").required = false;
        box.querySelector("#new-e-rif-nro").required = false;
        box.querySelector("#new-e-telf-num").required = false;
      }
    };

    // Bind clicks
    btnShowNew.onclick = () => toggleMode(true);
    btnHideNew.onclick = () => toggleMode(false);

    // Lógica Buscador
    inputSearch.onchange = () => {
      const val = inputSearch.value;
      const match = empresas.find((e) => formatEmpresa(e) === val);
      document.getElementById("v-empresa-id").value = match ? match.id : "";
    };

    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      let finalEmpresaId = null;

      try {
        if (isCreatingNew) {
          const payloadEmpresa = {
            nombre: document.getElementById("new-e-nombre").value,
            rif: {
              tipo: document.getElementById("new-e-rif-tipo").value,
              numero: document.getElementById("new-e-rif-nro").value,
            },
            direccion: {
              pais: "Venezuela",
              estado: "N/A",
              municipio: "N/A",
              descripcion: "Reg. Rápido",
            },
            telefonos: [
              {
                tipo: "Trabajo",
                codigo_pais: "+58",
                operadora: document.getElementById("new-e-telf-op").value,
                numero: document.getElementById("new-e-telf-num").value,
              },
            ],
          };

          const resEmp = await createEmpresaCombined(payloadEmpresa);
          finalEmpresaId = (resEmp.data.empresa || resEmp.data).id;
        } else {
          finalEmpresaId = document.getElementById("v-empresa-id").value;
          if (!finalEmpresaId) {
            alert("Debe seleccionar una empresa.");
            return;
          }
        }

        await createResource("vehiculos", {
          placa: document.getElementById("v-placa").value,
          id_empresas_transportes: parseInt(finalEmpresaId),
        });

        modal.hide();
        loadData(); // CORRECCIÓN 3: Llamar a loadData() al terminar
      } catch (err) {
        console.error(err);
        alert("Error: " + (err.response?.data?.error || err.message));
      }
    };
  });
};

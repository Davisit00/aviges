import {
  listResource,
  createChoferCombined,
  updateChoferCombined,
  deleteResource,
  getUserInfo,
  createEmpresaCombined,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";
import { COUNTRY_CODES } from "../utils.js";

let allItems = []; // <--- AGREGAR ESTO AL INICIO
let currentRole = null;

export async function init(container) {
  const u = await getUserInfo();
  currentRole = u.data.rol.id || u.data.user_rol;
  const isAdmin = currentRole === 1;

  container.innerHTML = `
    <div class="header-section">
      <h2>Choferes</h2>
      <button id="btn-create" class="btn-primary">Nuevo Chofer</button>
    </div>
    ${getSearchInputHTML("search-chof", "Nombre, Cédula o Empresa")}
    <div class="table-container">
      <table id="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Cédula</th>
            <th>Empresa Transporte</th>
            <th>Teléfono</th>
            ${isAdmin ? "<th>Acciones</th>" : ""}
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-create").onclick = () => showForm();
  loadTable();
}

async function loadTable() {
  const res = await listResource("choferes");
  allItems = res.data.items || res.data;

  setupSearchListener("search-chof", allItems, renderTable, [
    "persona.nombre",
    "persona.apellido",
    "persona.cedula",
    "empresa.nombre",
  ]);

  renderTable(allItems);
}

function renderTable(items) {
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const isAdmin = currentRole === 1;

    tbody.innerHTML = "";
    items.forEach((c) => {
      const p = c.persona || {};
      const emp = c.empresa || {};
      let phoneStr = "N/A";
      if (p.telefonos && p.telefonos.length > 0) {
        const t = p.telefonos[0];
        phoneStr = `${t.codigo_pais ? t.codigo_pais + " " : ""}${t.operadora}-${t.numero}`;
      }

      const tr = document.createElement("tr");
      const actionTd = isAdmin
        ? `<td><button class="btn-edit" data-id="${c.id}">Editar</button> <button class="btn-delete danger" data-id="${c.id}">Eliminar</button></td>`
        : "";

      tr.innerHTML = `
        <td>${p.nombre || ""} ${p.apellido || ""}</td>
        <td>${p.tipo_cedula || ""}-${p.cedula || ""}</td>
        <td>${emp.nombre || "N/A"}</td>
        <td>${phoneStr}</td>
        ${actionTd}
      `;
      tbody.appendChild(tr);
    });

    if (isAdmin) {
      tbody
        .querySelectorAll(".btn-delete")
        .forEach(
          (b) =>
            (b.onclick = (e) =>
              deleteResource("choferes", e.target.dataset.id).then(loadTable)),
        );
    }
  } catch (e) {
    console.error(e);
    tbody.innerHTML = '<tr><td colspan="5">Error</td></tr>';
  }
}

async function showForm(id = null, data = null) {
  // 1. Cargar Empresas
  let empresas = [];
  try {
    const res = await listResource("empresas_transporte");
    empresas = res.data.items || res.data;
  } catch (e) {
    console.error(e);
  }

  const formatEmpresa = (e) =>
    `${e.nombre} (${e.rif ? e.rif.tipo + "-" + e.rif.numero : "S/R"})`;

  let currentVal = "";
  if (data && data.id_empresas_transportes) {
    const found = empresas.find((e) => e.id === data.id_empresas_transportes);
    if (found) currentVal = formatEmpresa(found);
  }

  const datalistOpts = empresas
    .map((e) => `<option value="${formatEmpresa(e)}"></option>`)
    .join("");

  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

  // Valores preexistentes
  const dir = data?.persona?.direccion || {
    estado: "",
    municipio: "",
    sector: "",
    descripcion: "",
  };
  const tel = data?.persona?.telefonos?.[0] || {
    operadora: "",
    numero: "",
    codigo_pais: "+58",
  };

  const formHTML = `
      <form id="form-chofer">
        <div style="max-height: 450px; overflow-y: auto; padding-right:5px;">
            
            <h4>Datos Personales</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:10px;">
                <div class="form-group"><label>Nombre</label><input type="text" id="c-nombre" value="${data?.persona?.nombre || ""}" required></div>
                <div class="form-group"><label>Apellido</label><input type="text" id="c-apellido" value="${data?.persona?.apellido || ""}" required></div>
            </div>
            
            <div class="form-group" style="display:grid; grid-template-columns: 80px 1fr; gap:5px; margin-bottom:10px;">
                <label style="grid-column:span 2">Cédula</label>
                <select id="c-ced-tipo"><option value="V">V</option><option value="E">E</option></select>
                <input type="number" id="c-cedula" value="${data?.persona?.cedula || ""}" required placeholder="12345678">
            </div>

            <div class="form-group" style="background:#f9f9f9; padding:10px; border-radius:5px; margin-bottom:10px;">
                <label style="color:#003B73; font-weight:bold;">Dirección de Habitación</label>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; margin-bottom:5px;">
                    <input type="text" id="c-estado" placeholder="Estado" value="${dir.estado}" required>
                    <input type="text" id="c-muni" placeholder="Municipio" value="${dir.municipio}" required>
                    <input type="text" id="c-sector" placeholder="Sector" value="${dir.sector}" required>
                </div>
                <input type="text" id="c-descripcion" placeholder="Sector / Av / Calle" value="${dir.descripcion}" required style="width:100%">

            </div>
            
            <div class="form-group" style="display:flex; gap:5px; align-items:flex-end; margin-bottom:10px;">
                <div style="flex:1"><label>País</label><select id="c-telf-pais">${countryOptions}</select></div>
                <div style="width:100px"><label>Operadora</label><input id="c-telf-op" placeholder="04xx"></input></div>
                <div style="flex:1.5"><label>Número</label><input type="number" id="c-telf-num" value="${tel.numero}" required placeholder="1234567"></div>
            </div>

            <hr>

            <h4>Empresa Asociada</h4>
            <div class="form-group">
                <div id="section-search-e">
                    <input list="dl-emp-ch" id="c-empresa-input" placeholder="Buscar empresa solicitante..." value="${currentVal}" style="width:100%">
                    <datalist id="dl-emp-ch">${datalistOpts}</datalist>
                    <input type="hidden" id="c-empresa-id" value="${data?.id_empresas_transportes || ""}">
                    
                    ${
                      !id
                        ? `
                    <div style="margin-top:5px; text-align:right;">
                        <span id="btn-toggle-new" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
                            Registrar nueva empresa
                        </span>
                    </div>`
                        : ""
                    }
                </div>

                ${
                  !id
                    ? `
                <div id="section-new-e" style="display:none; background:#f0f8ff; padding:15px; gap:15px; flex-direction:column; margin-top:5px; border:1px solid #cce5ff; border-radius:5px; position:relative;">
                    
                    <span id="btn-close-new" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;">&times;</span>
                    
                    <h5 style="margin:0 0 10px 0; color:#003B73;">Nueva Empresa</h5>

                    <input type="text" id="new-e-nom" placeholder="Nombre Empresa" style="width:100%; margin-bottom:5px;">
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <select id="new-e-tipo"  style="width:20%"><option value="J">J</option><option value="G">G</option></select>
                        <input type="number" id="new-e-rif" style="width:100%" placeholder="RIF" style="flex:1">
                    </div>
                    <h5  style="margin:10px 0 0 0; color:#003B73;">Teléfono</h5>
                    <div style="display:flex; gap:2px;">
                        <select id="new-e-telf-pais" style="width:50%">${countryOptions}</select>
                        <input type="text" id="new-e-telf-op" placeholder="04xx" style="width:30%">
                        <input type="number" id="new-e-telf-num" placeholder="Num. Contacto">
                    </div>
                    <h5  style="margin:10px 0 0 0; color:#003B73;">Dirección</h5>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px; margin-bottom:5px;">
                        <input type="text" id="new-e-estado" placeholder="Estado">
                        <input type="text" id="new-e-municipio" placeholder="Municipio">
                        <input type="text" id="new-e-sector" placeholder="Sector" style="width:100%;">
                    </div>
                    <input type="text" id="new-e-desc" placeholder="Avenida / Calle / Edificio" style="width:100%">
                </div>
                `
                    : ""
                }
            </div>
        </div>

        <div class="modal-footer">
          <button type="submit" class="btn-primary">Guardar</button>
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        </div>
      </form>
    `;

  modal.show(id ? "Editar Chofer" : "Nuevo Chofer", formHTML, (box) => {
    // Restaurar selectores si es edición
    if (tel.codigo_pais)
      box.querySelector("#c-telf-pais").value = tel.codigo_pais;
    if (tel.operadora) box.querySelector("#c-telf-op").value = tel.operadora;

    let isNewMode = false;

    // Lógica de Toggle
    if (!id) {
      const btnShow = box.querySelector("#btn-toggle-new");
      const btnHide = box.querySelector("#btn-close-new");
      const secSearch = box.querySelector("#section-search-e");
      const secNew = box.querySelector("#section-new-e");
      const inpSearch = box.querySelector("#c-empresa-input");

      const toggleEmpresaMode = (showNew) => {
        isNewMode = showNew;
        secSearch.style.display = showNew ? "none" : "flex";
        secNew.style.display = showNew ? "flex" : "none";

        inpSearch.required = !showNew;
        box.querySelector("#new-e-nom").required = showNew;
        box.querySelector("#new-e-rif").required = showNew;
        box.querySelector("#new-e-telf-num").required = showNew;

        if (showNew) inpSearch.value = "";
      };

      btnShow.onclick = () => toggleEmpresaMode(true);
      btnHide.onclick = () => toggleEmpresaMode(false);

      inpSearch.required = true;
    }

    const inpSearch = box.querySelector("#c-empresa-input");
    inpSearch.onchange = () => {
      const match = empresas.find((e) => formatEmpresa(e) === inpSearch.value);
      document.getElementById("c-empresa-id").value = match ? match.id : "";
    };

    box.querySelector("#btn-cancel").onclick = () => modal.hide();

    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      try {
        let finalEmpID = document.getElementById("c-empresa-id").value;

        // 1. Crear Empresa
        if (!id && isNewMode) {
          const pEmp = {
            nombre: document.getElementById("new-e-nom").value,
            rif: {
              tipo: document.getElementById("new-e-tipo").value,
              numero: document.getElementById("new-e-rif").value,
            },
            direccion: {
              pais: "Venezuela",
              estado: document.getElementById("new-e-estado").value,
              municipio: document.getElementById("new-e-municipio").value,
              sector: document.getElementById("new-e-sector").value,
              descripcion: document.getElementById("new-e-desc").value,
            },
            telefonos: [
              {
                tipo: "Trabajo",
                codigo_pais: document.getElementById("new-e-telf-pais").value,
                operadora: document.getElementById("new-e-telf-op").value,
                numero: document.getElementById("new-e-telf-num").value,
              },
            ],
          };
          const res = await createEmpresaCombined(pEmp);
          finalEmpID = (res.data.empresa || res.data).id;
        } else {
          if (!finalEmpID) {
            alert("Empresa inválida");
            return;
          }
        }

        // 2. Crear Chofer
        const choferPayload = {
          persona: {
            nombre: document.getElementById("c-nombre").value,
            apellido: document.getElementById("c-apellido").value,
            tipo_cedula: document.getElementById("c-ced-tipo").value,
            cedula: document.getElementById("c-cedula").value,
            direccion: {
              pais: "Venezuela",
              estado: document.getElementById("c-estado").value,
              municipio: document.getElementById("c-muni").value,
              sector: document.getElementById("c-sector").value,
              descripcion: document.getElementById("c-descripcion").value,
            },
            telefonos: [
              {
                tipo: "Celular",
                codigo_pais: document.getElementById("c-telf-pais").value,
                operadora: document.getElementById("c-telf-op").value,
                numero: document.getElementById("c-telf-num").value,
              },
            ],
          },
          id_empresas_transportes: parseInt(finalEmpID),
        };

        if (id) {
          alert("Edición: Funcionalidad pendiente en backend.");
        } else {
          await createChoferCombined(choferPayload);
        }

        modal.hide();
        loadTable();
      } catch (err) {
        console.error(err);
        alert("Error: " + (err.response?.data?.error || err.message));
      }
    };
  });
}

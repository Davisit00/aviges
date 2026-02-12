import {
  listResource,
  createChoferCombined,
  updateChoferCombined,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { COUNTRY_CODES } from "../utils.js";

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
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

  try {
    const res = await listResource("choferes");
    const choferes = res.data.items || res.data;
    const isAdmin = currentRole === 1;

    tbody.innerHTML = "";

    choferes.forEach((c) => {
      const p = c.persona || {};
      const emp = c.empresa || {};

      // Formatear Telefono
      let phoneStr = "N/A";
      if (p.telefonos && p.telefonos.length > 0) {
        const t = p.telefonos[0];
        phoneStr = `${t.operadora}-${t.numero}`;
        if (isAdmin && t.codigo_pais) phoneStr = `${t.codigo_pais} ${phoneStr}`;
      }

      const tr = document.createElement("tr");

      const actionTd = isAdmin
        ? `<td>
             <button class="btn-edit" data-id="${c.id}" style="margin-right:5px;">Editar</button>
             <button class="btn-delete danger" data-id="${c.id}">Eliminar</button>
           </td>`
        : ""; // Operador no tiene acciones

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
      tbody.querySelectorAll(".btn-delete").forEach((b) => {
        b.onclick = (e) => deleteItem(e.target.dataset.id);
      });
      tbody.querySelectorAll(".btn-edit").forEach((b) => {
        b.onclick = async (e) => {
          try {
            const fullData = choferes.find((x) => x.id == e.target.dataset.id);
            showForm(e.target.dataset.id, fullData);
          } catch (err) {
            console.error(err);
          }
        };
      });
    }
  } catch (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="5">Error al cargar datos</td></tr>';
  }
}

async function showForm(id = null, data = null) {
  let optionsEmpresas = '<option value="">Seleccione Empresa...</option>';
  try {
    const res = await listResource("empresas_transporte");
    const items = res.data.items || res.data;

    optionsEmpresas += items
      .map(
        (e) =>
          `<option value="${e.id}" ${data && data.id_empresas_transportes === e.id ? "selected" : ""}>${e.nombre}</option>`,
      )
      .join("");
  } catch (e) {
    console.error(e);
  }

  const ph =
    data &&
    data.persona &&
    data.persona.telefonos &&
    data.persona.telefonos.length > 0
      ? data.persona.telefonos[0]
      : { codigo_pais: "+58", operadora: "", numero: "", tipo: "Celular" };

  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${ph.codigo_pais === c.code ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

  const formHTML = `
      <form id="form-chofer">
        <input type="hidden" id="edit-id" value="${id || ""}">
        
        <div class="form-group">
          <label>Empresa de Transporte</label>
          <select id="c-empresa" required>${optionsEmpresas}</select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group">
            <label>Nombre</label>
            <input type="text" id="c-nombre" value="${data?.persona?.nombre || ""}" required>
          </div>
          <div class="form-group">
            <label>Apellido</label>
            <input type="text" id="c-apellido" value="${data?.persona?.apellido || ""}" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 80px 1fr; gap: 10px;">
          <div class="form-group">
            <label>Tipo</label>
            <select id="c-tipo_cedula">
              <option value="V" ${data?.persona?.tipo_cedula === "V" ? "selected" : ""}>V</option>
              <option value="E" ${data?.persona?.tipo_cedula === "E" ? "selected" : ""}>E</option>
            </select>
          </div>
          <div class="form-group"><label>Cédula</label><input type="text" id="c-cedula" value="${data?.persona?.cedula || ""}" required></div>
        </div>

        <label>Teléfono de Contacto</label>
        <div style="display:flex; gap:5px; margin-bottom:15px; align-items:flex-end;">
            <div style="flex:1;">
                <label style="font-size:0.8em">Tipo</label>
                <select id="c-ph-tipo" style="width:100%">
                    <option value="Celular" ${ph.tipo === "Celular" ? "selected" : ""}>Celular</option>
                    <option value="Casa" ${ph.tipo === "Casa" ? "selected" : ""}>Casa</option>
                    <option value="Trabajo" ${ph.tipo === "Trabajo" ? "selected" : ""}>Trabajo</option>
                </select>
            </div>
            <div style="width:140px;">
                <label style="font-size:0.8em">País</label>
                <!-- Select de País -->
                <select id="c-ph-pais" style="width:100%">${countryOptions}</select>
            </div>
            <div style="width:80px;">
                <label style="font-size:0.8em">Área</label>
                <input type="text" id="c-ph-area" value="${ph.operadora || ""}" placeholder="412">
            </div>
            <div style="flex:2;">
                <label style="font-size:0.8em">Número</label>
                <input type="text" id="c-ph-num" value="${ph.numero || ""}" placeholder="1234567">
            </div>
        </div>
        
        <!-- Dirección (Simplificada para el ejemplo, expandir según necesidad) -->
        <div class="form-group">
             <label>Dirección</label>
             <input type="text" id="c-direccion" placeholder="Dirección completa" 
                value="${data?.persona?.direccion?.descripcion || ""}">
        </div>

        <div class="modal-footer">
          <button type="submit" class="btn-primary">Guardar</button>
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        </div>
      </form>
    `;

  modal.show(id ? "Editar Chofer" : "Nuevo Chofer", formHTML, (box) => {
    box.querySelector("#btn-cancel").onclick = () => modal.hide();
    box.querySelector("form").onsubmit = (e) => handleSave(e, id);
  });
}

async function handleSave(e, currentId) {
  e.preventDefault();
  const form = e.target;

  const payload = {
    persona: {
      nombre: form.querySelector("#c-nombre").value,
      apellido: form.querySelector("#c-apellido").value,
      tipo_cedula: form.querySelector("#c-tipo_cedula").value,
      cedula: form.querySelector("#c-cedula").value,
      telefonos: [
        {
          tipo: form.querySelector("#c-ph-tipo").value,
          codigo_pais: form.querySelector("#c-ph-pais").value,
          operadora: form.querySelector("#c-ph-area").value,
          numero: form.querySelector("#c-ph-num").value,
        },
      ],
      direccion: {
        descripcion: form.querySelector("#c-direccion").value,
        pais: "Venezuela",
        estado: "N/A",
        municipio: "N/A",
        sector: "N/A",
      },
    },
    id_empresas_transportes: parseInt(form.querySelector("#c-empresa").value),
  };

  try {
    if (currentId) {
      await updateChoferCombined(currentId, payload);
    } else {
      await createChoferCombined(payload);
    }
    modal.hide();
    loadTable();
  } catch (err) {
    console.error(err);
    alert("Error al guardar chofer. Verifique los datos obligatorios.");
  }
}

async function deleteItem(id) {
  if (confirm("¿Seguro de eliminar?")) {
    await deleteResource("choferes", id);
    loadTable();
  }
}

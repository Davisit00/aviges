import {
  listResource,
  createGranjaCombined,
  deleteResource,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { COUNTRY_CODES } from "../utils.js"; // IMPORTAR

let isAdmin = false;

export async function init(container) {
  const u = await getUserInfo();
  isAdmin = (u.data.rol.id || u.data.user_rol) === 1;
  container.innerHTML = `
        <div class="header-section">
            <h2>Granjas</h2>
            <button id="new-granja" class="btn-primary">Nueva Granja</button>
        </div>
        <div id="granja-list" class="cards-grid"></div>
    `;
  document.getElementById("new-granja").onclick = showCreateForm;
  load();
}

async function load() {
  const res = await listResource("granjas");
  const items = res.data.items || res.data;
  const div = document.getElementById("granja-list");

  if (items.length === 0) {
    div.innerHTML = "<p>No hay granjas registradas.</p>";
    return;
  }

  div.innerHTML = items
    .map((g) => {
      const ubi = g.ubicacion ? g.ubicacion.nombre : "Sin Nombre";
      const rif = g.rif ? `${g.rif.tipo}-${g.rif.numero}` : "S/R";
      const estado = g.ubicacion?.direccion?.estado || "N/A";
      const responsable = g.persona_responsable
        ? `${g.persona_responsable.nombre} ${g.persona_responsable.apellido}`
        : "S/D";

      let cardContent = `<h3>${ubi}</h3>`;
      cardContent += `<p><strong>Estado:</strong> ${estado}</p>`;
      cardContent += `<p><strong>Responsable:</strong> ${responsable}</p>`;

      if (isAdmin) {
        cardContent += `<p><small>RIF: ${rif}</small></p>`; // Dato tecnico solo admin
        cardContent += `<button class="btn-delete danger" data-id="${g.id}">Eliminar</button>`;
      }

      return `<div class="card">${cardContent}</div>`;
    })
    .join("");

  if (isAdmin) {
    div.querySelectorAll(".btn-delete").forEach(
      (b) =>
        (b.onclick = async (e) => {
          if (confirm("¿Borrar Granja?")) {
            await deleteResource("granjas", e.target.dataset.id);
            load();
          }
        }),
    );
  }
}

function showCreateForm() {
  const countryOptions = COUNTRY_CODES.map(
    (c) =>
      `<option value="${c.code}" ${c.code === "+58" ? "selected" : ""}>${c.name} (${c.code})</option>`,
  ).join("");

  const html = `
    <form id="f-granja">
        <h4>Datos de Ubicación (Granja)</h4>
        <div class="form-group">
            <label>Nombre de la Granja</label>
            <input type="text" id="g-nombre" placeholder="Ej. La Providencia" required>
        </div>
        
        <div class="form-group">
            <label>RIF</label>
            <div style="display:flex; gap:10px;">
                <select id="g-rif-tipo" style="width:70px"><option value="J">J</option><option value="G">G</option></select>
                <input type="text" id="g-rif-num" required style="flex:1">
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
                <input type="text" id="g-est" placeholder="Estado" required>
                <input type="text" id="g-mun" placeholder="Municipio" required>
            </div>
            <input type="text" id="g-sec" placeholder="Sector" style="margin-top:5px; width:100%" required>
        </div>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;">
        
        <h4>Datos del Responsable</h4>
        <div class="form-group">
            <div style="display:flex; gap:10px; margin-bottom: 10px;">
                <select id="resp-tipo-cedula" style="width:70px"><option value="V">V</option><option value="E">E</option></select>
                <input type="text" id="resp-cedula" placeholder="Cédula" required style="flex:1;">
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <input type="text" id="resp-nombre" placeholder="Nombre" required>
                <input type="text" id="resp-apellido" placeholder="Apellido" required>
            </div>
        </div>

        <div class="modal-footer">
            <button type="submit" class="btn-primary">Guardar</button>
        </div>
    </form>`;

  modal.show("Registrar Granja", html, (box) => {
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();

      const payload = {
        ubicacion: {
          nombre: document.getElementById("g-nombre").value,
          direccion: {
            pais: "Venezuela",
            estado: document.getElementById("g-est").value,
            municipio: document.getElementById("g-mun").value,
            sector: document.getElementById("g-sec").value,
            descripcion: "Granja",
          },
        },
        rif: {
          tipo: document.getElementById("g-rif-tipo").value,
          numero: document.getElementById("g-rif-num").value,
        },
        // NUEVO: Datos de persona anidados
        persona: {
          cedula: document.getElementById("resp-cedula").value,
          tipo_cedula: document.getElementById("resp-tipo-cedula").value,
          nombre: document.getElementById("resp-nombre").value,
          apellido: document.getElementById("resp-apellido").value,
          // Agrega direccion/telefonos aqui si se requiriera guardar contacto PERSONAL del responsable
          direccion: {
            estado: "N/A",
            municipio: "N/A",
            sector: "N/A",
            pais: "Venezuela",
          }, // Stub requerido por backend a veces
        },
        telefonos: [
          {
            tipo: document.getElementById("g-ph-tipo").value,
            codigo_pais: document.getElementById("g-ph-pais").value,
            operadora: document.getElementById("g-ph-area").value,
            numero: document.getElementById("g-ph-num").value,
          },
        ],
      };

      try {
        await createGranjaCombined(payload);
        modal.hide();
        load();
      } catch (x) {
        console.error(x);
        alert(
          "Error al crear granja: " + (x.response?.data?.error || x.message),
        );
      }
    };
  });
}

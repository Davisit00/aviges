import {
  listResource,
  createResource,
  registerWeigh,
  printTicket,
  saveNotaEntrega,
  getNotaEntrega,
  getUserInfo,
  getWeighFromTruckScale,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";

let allTickets = [];
let vehiclesList = [];
let driversList = [];
let productsList = [];
let ubicacionesList = [];
let currentUser = null;
const TIPO_UBICACIONES = [
  "Matadero",
  "Balanceados",
  "Despresados",
  "Incubadora",
  "Reciclaje",
  "Proveedor",
  "Cliente",
  "Almacen",
  "Granja",
];
const asignacionId = null;

export async function init(container) {
  currentUser = (await getUserInfo()).data;

  container.innerHTML = `
    <div class="header-section">
      <h2>Tickets de Pesaje</h2>
      <button id="btn-entrada" class="btn-primary">Registrar ENTRADA</button>
      <button id="btn-salida" class="btn-primary" style="background:#2196F3;">Registrar SALIDA</button>
    </div>
    <div style="margin-bottom:10px;">
      ${getSearchInputHTML("search-tickets", "Buscar por placa, chofer, producto...")}
    </div>
    <div class="table-container">
      <table id="tickets-table">
        <thead>
          <tr>
            <th>#Ticket</th>
            <th>Tipo</th>
            <th>Placa</th>
            <th>Producto</th>
            <th>Chofer</th>
            <th>1er Peso</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tickets-tbody"></tbody>
      </table>
    </div>
  `;

  document.getElementById("btn-entrada").onclick = () =>
    showTicketForm("Entrada");
  document.getElementById("btn-salida").onclick = () =>
    showTicketForm("Salida");

  await loadLists();
  await loadTickets();
}

async function loadLists() {
  const [vRes, dRes, pRes, uRes] = await Promise.all([
    listResource("vehiculos", { per_page: 1000 }),
    listResource("choferes", { per_page: 1000 }),
    listResource("productos", { per_page: 1000 }),
    listResource("ubicaciones", { per_page: 1000 }),
  ]);
  vehiclesList = vRes.items || vRes.data;
  driversList = dRes.items || dRes.data;
  productsList = pRes.items || pRes.data;
  ubicacionesList = uRes.items || uRes.data;
}

async function loadTickets() {
  const res = await listResource("tickets_pesaje", {
    estado: "En Proceso",
    sort: "id",
    order: "desc",
  });
  allTickets = res.items || res.data || [];
  setupSearchListener("search-tickets", allTickets, renderTable, [
    "nro_ticket",
    "tipo_proceso",
    "vehiculo.placa",
    "producto.nombre",
    "chofer.nombre",
  ]);
  renderTable(allTickets);
}

function renderTable(items) {
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No hay tickets en proceso.</td></tr>`;
    return;
  }
  tbody.innerHTML = items
    .map((ticket) => {
      const vehiculo = vehiclesList.find((v) => v.id == ticket.id_vehiculo);
      console.log(
        "Renderizando ticket:",
        ticket,
        "Vehículo encontrado:",
        vehiculo,
      );
      const producto = productsList.find((p) => p.id == ticket.id_producto);
      const chofer = driversList.find((c) => c.id == ticket.id_chofer);
      const pesoInicial =
        ticket.peso_bruto > 0
          ? `Bruto: ${ticket.peso_bruto}`
          : `Tara: ${ticket.peso_tara}`;
      return `
      <tr>
        <td>${ticket.nro_ticket || ticket.id}</td>
        <td>${ticket.tipo}</td>
        <td>${ticket.asignacion.vehiculo.placa}</td>
        <td>${ticket.producto.nombre}</td>
        <td>${ticket.asignacion.chofer.persona.nombre + " " + ticket.asignacion.chofer.persona.apellido}</td>
        <td>${pesoInicial}</td>
        <td>${new Date(ticket.created_at || ticket.fecha_registro).toLocaleString()}</td>
        <td><span style="background:orange; padding:2px 5px; border-radius:4px;">${ticket.estado}</span></td>
        <td>
          <button class="btn-primary btn-small" data-id="${ticket.id}" data-action="pesar">Segundo Pesaje</button>
          <button class="btn-secondary btn-small" data-id="${ticket.id}" data-action="nota">Nota Entrega</button>
        </td>
      </tr>
    `;
    })
    .join("");

  // Acciones
  tbody.querySelectorAll("button[data-action='pesar']").forEach((btn) => {
    btn.onclick = () =>
      showSecondWeighModal(allTickets.find((t) => t.id == btn.dataset.id));
  });
  tbody.querySelectorAll("button[data-action='nota']").forEach((btn) => {
    btn.onclick = () => showNotaEntregaModal(btn.dataset.id);
  });
}

// --- MODALES ---

function showTicketForm(tipo) {
  let currentUbicVal = "";
  let currentDestVal = "";
  let ubicaciones = ubicacionesList || [];
  const formatUbicacion = (u) => `${u.nombre} (${u.tipo || "Sin tipo"})`;

  const datalistUbicOpts = ubicaciones
    .map((u) => `<option value="${formatUbicacion(u)}"></option>`)
    .join("");

  let formHTML = `
    <form id="ticket-form">
      <div class="form-group">
        <label>Vehículo (Placa)</label>
        <input list="list-vehiculos" id="vehiculo" required>
        <datalist id="list-vehiculos">
          ${vehiclesList.map((v) => `<option value="${v.placa}">`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <label>Chofer</label>
        <input list="list-choferes" id="chofer" required>
        <datalist id="list-choferes">
          ${driversList.map((c) => `<option value="${c.persona.nombre} ${c.persona.apellido} - ${c.persona.tipo_cedula}${c.persona.cedula}">`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <label>Producto</label>
        <input list="list-productos" id="producto" required>
        <datalist id="list-productos">
          ${productsList.map((p) => `<option value=" ${p.codigo} - ${p.nombre}">`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <h4>Origen</h4>
        <div id="section-search-ubic">
          <input list="dl-ubic" id="ubic-input" placeholder="Buscar ubicación..." value="${currentUbicVal}" style="width:100%">
          <datalist id="dl-ubic">${datalistUbicOpts}</datalist>
          <input type="hidden" id="ubic-id" value="">
          <div style="margin-top:5px; text-align:right;">
            <span id="btn-toggle-new-ubic" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
              Registrar nueva ubicación
            </span>
          </div>
        </div>
        <div id="section-new-ubic" style="display:none; background:#f0f8ff; padding:15px; gap:15px; flex-direction:column; margin-top:5px; border:1px solid #cce5ff; border-radius:5px; position:relative;">
          <span id="btn-close-new-ubic" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;">&times;</span>
          <h5 style="margin:0 0 10px 0; color:#003B73;">Nueva Ubicación</h5>
          <input type="text" id="new-ubic-nom" placeholder="Nombre ubicación" style="width:100%; margin-bottom:5px;">
          <select id="new-ubic-tipo" name="new-ubic-tipo" style="width:100%; margin-bottom:5px;">
            ${TIPO_UBICACIONES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          <input type="text" id="new-ubic-estado" name="new-ubic-estado" placeholder="Estado">
          <input type="text" id="new-ubic-municipio" name="new-ubic-municipio" placeholder="Municipio">
          <input type="text" id="new-ubic-sector" name="new-ubic-sector" placeholder="Sector / Detalle">
          <input type="text" id="new-ubic-desc" name="new-ubic-desc" placeholder="Avenida / Calle / Edificio" style="width:100%">
        </div>
      </div>
      <div class="form-group">
        <h4>Destino</h4>
        <div id="section-search-dest">
          <input list="dl-dest" id="dest-input" placeholder="Buscar ubicación..." value="${currentDestVal}" style="width:100%">
          <datalist id="dl-dest">${datalistUbicOpts}</datalist>
          <input type="hidden" id="dest-id" value="">
          <div style="margin-top:5px; text-align:right;">
            <span id="btn-toggle-new-dest" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
              Registrar nueva ubicación
            </span>
          </div>
        </div>
        <div id="section-new-dest" style="display:none; background:#f0f8ff; padding:15px; gap:15px; flex-direction:column; margin-top:5px; border:1px solid #cce5ff; border-radius:5px; position:relative;">
          <span id="btn-close-new-dest" style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold; color:#666; font-size:1.2em;">&times;</span>
          <h5 style="margin:0 0 10px 0; color:#003B73;">Nueva Ubicación</h5>
          <input type="text" id="new-dest-nom" placeholder="Nombre ubicación" style="width:100%; margin-bottom:5px;">
          <select id="new-dest-tipo" name="new-dest-tipo" style="width:100%; margin-bottom:5px;">
            ${TIPO_UBICACIONES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          </select>
          <input type="text" id="new-dest-estado" name="new-dest-estado" placeholder="Estado">
          <input type="text" id="new-dest-municipio" name="new-dest-municipio" placeholder="Municipio">
          <input type="text" id="new-dest-sector" name="new-dest-sector" placeholder="Sector / Detalle">
          <input type="text" id="new-dest-desc" name="new-dest-desc" placeholder="Avenida / Calle / Edificio" style="width:100%">
        </div>
      </div>
      <div class="form-group" style="display:flex; gap:10px; align-items:end;">
        <div style="flex:1;">
          <label>Peso Bruto</label>
          <input type="number" id="peso-bruto" min="0" step="0.01" required>
          <button type="button" id="btn-get-bruto" class="btn-small" style="margin-top:5px;">Leer Báscula</button>
        </div>
        <div style="flex:1;">
          <label>Peso Tara</label>
          <input type="number" id="peso-tara" min="0" step="0.01" required>
          <button type="button" id="btn-get-tara" class="btn-small" style="margin-top:5px;">Leer Báscula</button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
      </div>
    </form>
  `;

  modal.show(`Registrar ${tipo}`, formHTML, (box) => {
    let isNewUbicMode = false;
    const btnShowUbic = box.querySelector("#btn-toggle-new-ubic");
    const btnHideUbic = box.querySelector("#btn-close-new-ubic");
    const secSearchUbic = box.querySelector("#section-search-ubic");
    const secNewUbic = box.querySelector("#section-new-ubic");
    const inpSearchUbic = box.querySelector("#ubic-input");

    const toggleUbicMode = (showNew) => {
      isNewUbicMode = showNew;
      secSearchUbic.style.display = showNew ? "none" : "block";
      secNewUbic.style.display = showNew ? "flex" : "none";
      inpSearchUbic.required = !showNew;

      // Solo poner required en los campos visibles
      [
        "#new-ubic-nom",
        "#new-ubic-estado",
        "#new-ubic-municipio",
        "#new-ubic-sector",
        "#new-ubic-desc",
      ].forEach((sel) => {
        const el = box.querySelector(sel);
        if (el) el.required = showNew;
      });
      if (showNew) inpSearchUbic.value = "";
    };

    btnShowUbic.onclick = () => toggleUbicMode(true);
    btnHideUbic.onclick = () => toggleUbicMode(false);

    inpSearchUbic.onchange = () => {
      const match = ubicacionesList.find(
        (u) => formatUbicacion(u) === inpSearchUbic.value,
      );
      box.querySelector("#ubic-id").value = match ? match.id : "";
    };

    // --- DESTINO ---
    let isNewDestMode = false;
    const btnShowDest = box.querySelector("#btn-toggle-new-dest");
    const btnHideDest = box.querySelector("#btn-close-new-dest");
    const secSearchDest = box.querySelector("#section-search-dest");
    const secNewDest = box.querySelector("#section-new-dest");
    const inpSearchDest = box.querySelector("#dest-input");

    const toggleDestMode = (showNew) => {
      isNewDestMode = showNew;
      secSearchDest.style.display = showNew ? "none" : "block";
      secNewDest.style.display = showNew ? "flex" : "none";
      inpSearchDest.required = !showNew;

      [
        "#new-dest-nom",
        "#new-dest-estado",
        "#new-dest-municipio",
        "#new-dest-sector",
        "#new-dest-desc",
      ].forEach((sel) => {
        const el = box.querySelector(sel);
        if (el) el.required = showNew;
      });
      if (showNew) inpSearchDest.value = "";
    };

    btnShowDest.onclick = () => toggleDestMode(true);
    btnHideDest.onclick = () => toggleDestMode(false);

    inpSearchDest.onchange = () => {
      const match = ubicacionesList.find(
        (u) => formatUbicacion(u) === inpSearchDest.value,
      );
      box.querySelector("#dest-id").value = match ? match.id : "";
    };

    // --- PESOS ---
    const inpBruto = box.querySelector("#peso-bruto");
    const inpTara = box.querySelector("#peso-tara");
    const btnBruto = box.querySelector("#btn-get-bruto");
    const btnTara = box.querySelector("#btn-get-tara");

    if (tipo === "Entrada") {
      inpBruto.disabled = false;
      btnBruto.disabled = false;
      inpBruto.required = true;
      inpTara.disabled = true;
      btnTara.disabled = true;
      inpTara.required = false;
      inpTara.value = "";
    } else {
      inpBruto.disabled = true;
      btnBruto.disabled = true;
      inpBruto.required = false;
      inpBruto.value = "";
      inpTara.disabled = false;
      btnTara.disabled = false;
      inpTara.required = true;
    }

    // Solo permite capturar el primer peso
    btnBruto.onclick = async () => {
      btnBruto.disabled = true;
      const res = await getWeighFromTruckScale();
      inpBruto.value = res.data.data || "";
      btnBruto.disabled = false;
    };
    btnTara.onclick = async () => {
      btnTara.disabled = true;
      const res = await getWeighFromTruckScale();
      inpTara.value = res.data.data || "";
      btnTara.disabled = false;
    };

    // --- CANCELAR ---
    box.querySelector("#btn-cancel").onclick = () => modal.hide();

    // --- SUBMIT ---
    box.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      let finalUbicID = box.querySelector("#ubic-id").value;
      let finalDestID = box.querySelector("#dest-id").value;

      // Crear ubicación origen si es modo nuevo
      if (isNewUbicMode) {
        const payloadUbic = {
          nombre: box.querySelector("#new-ubic-nom").value,
          tipo: box.querySelector("#new-ubic-tipo").value,
          direccion: {
            pais: "Venezuela",
            estado: box.querySelector("#new-ubic-estado").value,
            municipio: box.querySelector("#new-ubic-municipio").value,
            sector: box.querySelector("#new-ubic-sector").value,
            descripcion: box.querySelector("#new-ubic-desc").value,
          },
        };
        const res = await createResource("ubicaciones", payloadUbic);
        finalUbicID = res.data.id;
      } else {
        if (!finalUbicID) {
          alert("Ubicación de origen inválida");
          return;
        }
      }

      // Crear ubicación destino si es modo nuevo
      if (isNewDestMode) {
        const payloadDest = {
          nombre: box.querySelector("#new-dest-nom").value,
          tipo: box.querySelector("#new-dest-tipo").value,
          direccion: {
            pais: "Venezuela",
            estado: box.querySelector("#new-dest-estado").value,
            municipio: box.querySelector("#new-dest-municipio").value,
            sector: box.querySelector("#new-dest-sector").value,
            descripcion: box.querySelector("#new-dest-desc").value,
          },
        };
        const res = await createResource("ubicaciones", payloadDest);
        finalDestID = res.data.id;
      } else {
        if (!finalDestID) {
          alert("Ubicación de destino inválida");
          return;
        }
      }

      // --- AQUÍ DEBES CREAR EL TICKET ---
      // Recoge los datos del formulario
      const vehiculoPlaca = box.querySelector("#vehiculo").value;
      const choferNombre = box.querySelector("#chofer").value;
      const productoNombre = box.querySelector("#producto").value;

      // Busca los IDs reales
      const vehiculo = vehiclesList.find((v) => v.placa === vehiculoPlaca);
      const chofer = driversList.find(
        (c) =>
          `${c.persona.nombre} ${c.persona.apellido} - ${c.persona.tipo_cedula}${c.persona.cedula}` ===
          choferNombre,
      );
      const producto = productsList.find((p) =>
        productoNombre.includes(p.nombre),
      );

      if (!vehiculo || !chofer || !producto) {
        alert("Debe seleccionar un vehículo, chofer y producto válidos.");
        return;
      }

      // --- SOLO ENVÍA EL PRIMER PESO ---
      let ticketPayload = {
        id_vehiculo: vehiculo.id,
        id_chofer: chofer.id,
        id_producto: producto.id,
        id_origen: Number(finalUbicID),
        id_destino: Number(finalDestID),
        tipo: tipo,
        estado: "En proceso",
        id_usuarios_primer_peso: currentUser.id,
        fecha_primer_peso: new Date().toISOString(),
      };

      if (tipo === "Entrada") {
        ticketPayload.peso_bruto = parseFloat(inpBruto.value) || 0;
        ticketPayload.peso_tara = null;
      } else {
        ticketPayload.peso_bruto = null;
        ticketPayload.peso_tara = parseFloat(inpTara.value) || 0;
      }

      try {
        await createResource("tickets_pesaje", ticketPayload);
        modal.hide();
        await loadTickets();
      } catch (err) {
        alert("Error creando ticket: " + (err?.error || err?.message || err));
      }
    };
  });
}

function showSecondWeighModal(ticket) {
  const tipoPeso = ticket.peso_bruto > 0 ? "tara" : "bruto";
  modal.show(
    `Registrar Segundo Peso (${tipoPeso === "bruto" ? "Bruto" : "Tara"})`,
    `
      <form id="form-peso">
        <div class="form-group">
          <label>Peso (${tipoPeso === "bruto" ? "Bruto (Full)" : "Tara (Vacío)"})</label>
          <input type="number" id="peso-input" required style="width:100%;">
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn-primary">Guardar Peso</button>
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        </div>
      </form>
    `,
    (box) => {
      box.querySelector("#btn-cancel").onclick = () => modal.hide();
      box.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const peso = parseFloat(box.querySelector("#peso-input").value);
        if (!peso) return alert("Ingrese un peso válido");
        await registerWeigh({
          id_ticket: ticket.id,
          tipo: tipoPeso,
          peso,
        });
        modal.hide();
        await printTicket(ticket.id);
        await loadTickets();
      };
    },
  );
}

function showNotaEntregaModal(ticketId) {
  modal.show(
    "Registrar Nota de Entrega",
    `
      <form id="form-nota">
        <div class="form-group">
          <label>Origen</label>
          <input type="text" id="origen" required>
        </div>
        <div class="form-group">
          <label>Destino</label>
          <input type="text" id="destino" required>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn-primary">Guardar Nota</button>
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        </div>
      </form>
    `,
    (box) => {
      // --- FUNCIONES DE AYUDA ---

      const origenSelect = box.querySelector("#origen-select");
      const origenNuevoSection = box.querySelector("#origen-nuevo-section");
      const btnCancelNuevoOrigen = box.querySelector(
        "#btn-cancel-nuevo-origen",
      );
      const btnSaveNuevoOrigen = box.querySelector("#btn-save-nuevo-origen");

      origenSelect.onchange = () => {
        if (origenSelect.value === "__nuevo__") {
          origenNuevoSection.style.display = "block";
        } else {
          origenNuevoSection.style.display = "none";
        }
      };

      btnCancelNuevoOrigen.onclick = () => {
        origenNuevoSection.style.display = "none";
        origenSelect.value = "";
      };

      btnSaveNuevoOrigen.onclick = async () => {
        const nombre = box.querySelector("#origen-nombre").value.trim();
        const tipo = box.querySelector("#origen-tipo").value.trim();
        const estado = box.querySelector("#origen-estado").value.trim();
        const municipio = box.querySelector("#origen-municipio").value.trim();
        const sector = box.querySelector("#origen-sector").value.trim();
        if (!nombre || !tipo || !estado || !municipio) {
          alert("Complete todos los campos de ubicación");
          return;
        }
        const res = await createResource("ubicaciones", {
          nombre,
          tipo,
          direccion: {
            pais: "Venezuela",
            estado,
            municipio,
            sector,
            descripcion: nombre,
          },
        });
        await loadLists(); // Recarga ubicacionesList
        origenSelect.innerHTML =
          `<option value="">Seleccione...</option>` +
          ubicacionesList
            .map(
              (u) => `<option value="${u.id}">${u.nombre} (${u.tipo})</option>`,
            )
            .join("") +
          `<option value="__nuevo__">Registrar nueva ubicación</option>`;
        origenSelect.value = res.data.id;
        origenNuevoSection.style.display = "none";
      };

      // --- DESTINO: Búsqueda y registro nuevo similar a empresas en choferes.js ---
      const destinoNombre = box.querySelector("#destino-nombre");
      const destinoTipo = box.querySelector("#destino-tipo");
      const destinoEstado = box.querySelector("#destino-estado");
      const destinoMunicipio = box.querySelector("#destino-municipio");
      const destinoSector = box.querySelector("#destino-sector");

      // Insertar barra de búsqueda y botón para registrar nuevo destino
      const destinoGroup = destinoNombre.closest(".form-group");
      destinoGroup.innerHTML = `
        <label>Destino</label>
        <div id="destino-search-section">
          ${getSearchInputHTML("destino-search", "Buscar ubicación destino...")}
          <select id="destino-select" required style="width:100%;margin-top:5px;">
            <option value="">Seleccione...</option>
            ${ubicacionesList.map((u) => `<option value="${u.id}">${u.nombre} (${u.tipo})</option>`).join("")}
          </select>
          <div style="margin-top:5px; text-align:right;">
            <span id="btn-toggle-nuevo-destino" style="color:#003B73; cursor:pointer; text-decoration:underline; font-size:0.9em;">
              Registrar nueva ubicación
            </span>
          </div>
        </div>
        <div id="destino-nuevo-section" style="display:none; background:#f0f8ff; padding:10px; border-radius:5px; margin-top:5px;">
          <span id="btn-cancel-nuevo-destino" style="float:right; cursor:pointer; font-weight:bold;">&times;</span>
          <input type="text" id="nuevo-destino-nombre" placeholder="Nombre ubicación" style="width:100%; margin-bottom:5px;">
          <select id="nuevo-destino-tipo" style="width:100%; margin-bottom:5px;">
            <option value="">Seleccione...</option>
            ${ubicacionesList.map((u) => `<option value="${u.id}">${u.nombre} (${u.tipo})</option>`).join("")}
          </select>
          <input type="text" id="nuevo-destino-estado" placeholder="Estado" style="width:100%; margin-bottom:5px;">
          <input type="text" id="nuevo-destino-municipio" placeholder="Municipio" style="width:100%; margin-bottom:5px;">
          <input type="text" id="nuevo-destino-sector" placeholder="Sector / Detalle" style="width:100%; margin-bottom:5px;">
          <button type="button" id="btn-save-nuevo-destino" class="btn-primary btn-small">Guardar ubicación</button>
        </div>
      `;

      // Referencias destino
      const destinoSelect = box.querySelector("#destino-select");
      const destinoNuevoSection = box.querySelector("#destino-nuevo-section");
      const btnToggleNuevoDestino = box.querySelector(
        "#btn-toggle-nuevo-destino",
      );
      const btnCancelNuevoDestino = box.querySelector(
        "#btn-cancel-nuevo-destino",
      );
      const btnSaveNuevoDestino = box.querySelector("#btn-save-nuevo-destino");

      // Búsqueda destino
      setupSearchListener(
        "destino-search",
        ubicacionesList,
        (filtered) => {
          destinoSelect.innerHTML =
            `<option value="">Seleccione...</option>` +
            filtered
              .map(
                (u) =>
                  `<option value="${u.id}">${u.nombre} (${u.tipo})</option>`,
              )
              .join("");
        },
        [
          "nombre",
          "tipo",
          "direccion.estado",
          "direccion.municipio",
          "direccion.sector",
        ],
      );

      // Mostrar formulario nuevo destino
      btnToggleNuevoDestino.onclick = () => {
        destinoNuevoSection.style.display = "block";
        box.querySelector("#destino-search-section").style.display = "none";
      };

      // Cancelar nuevo destino
      btnCancelNuevoDestino.onclick = () => {
        destinoNuevoSection.style.display = "none";
        box.querySelector("#destino-search-section").style.display = "block";
        destinoSelect.value = "";
      };

      // Guardar nueva ubicación destino
      btnSaveNuevoDestino.onclick = async () => {
        const nombre = box.querySelector("#nuevo-destino-nombre").value.trim();
        const tipo = box.querySelector("#nuevo-destino-tipo").value.trim();
        const estado = box.querySelector("#nuevo-destino-estado").value.trim();
        const municipio = box
          .querySelector("#nuevo-destino-municipio")
          .value.trim();
        const sector = box.querySelector("#nuevo-destino-sector").value.trim();
        if (!nombre || !tipo || !estado || !municipio) {
          alert("Complete todos los campos de ubicación");
          return;
        }
        const res = await createResource("ubicaciones", {
          nombre,
          tipo,
          direccion: {
            pais: "Venezuela",
            estado,
            municipio,
            sector,
            descripcion: nombre,
          },
        });
        await loadLists();
        destinoSelect.innerHTML =
          `<option value="">Seleccione...</option>` +
          ubicacionesList
            .map(
              (u) => `<option value="${u.id}">${u.nombre} (${u.tipo})</option>`,
            )
            .join("") +
          `<option value="__nuevo__">Registrar nueva ubicación</option>`;
        destinoSelect.value = res.data.id;
        destinoNuevoSection.style.display = "none";
        box.querySelector("#destino-search-section").style.display = "block";
      };

      // --- ASIGNACIÓN (Vehículo + Chofer) ---
      // Puedes hacer un bloque similar, con dos selects (vehículo y chofer) y un botón para registrar nueva asignación si lo deseas.
      // Si quieres que la asignación se cree automáticamente al seleccionar ambos, solo asegúrate de enviar ambos IDs y que el backend la cree si no existe.

      box.querySelector("#btn-cancel").onclick = () => modal.hide();
      box.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const data = {
          origen: {
            origen: box.querySelector("#origen").value,
            destino: box.querySelector("#destino").value,
          },
        };
        await saveNotaEntrega(ticketId, data);
        modal.hide();
      };
    },
  );
}

import {
  listResource,
  createResource,
  registerWeigh,
  getPrintTicketData,
  saveNotaEntrega,
  getNotaEntrega,
  getReimpresiones,
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
            <th>Peso bruto</th>
            <th>Peso tara</th>
            <th>Peso Neto</th>
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

async function printTicket(ticketId) {
  // Busca el ticket en la lista
  const ticket = allTickets.find((t) => t.id === ticketId);
  if (!ticket) {
    alert("No se encontró el ticket para imprimir.");
    return;
  }
  let response;
  let reimpresiones;
  try {
    response = await getPrintTicketData(ticket.id);
    reimpresiones = await getReimpresiones(ticket.id);
  } catch (err) {
    alert("Error obteniendo los datos del ticket para imprimir.");
    return;
  }
  const data = {
    ...response.data,
    reimpresiones: reimpresiones.data.reimpresiones,
  };
  if (!data) {
    alert("No se pudieron obtener los datos del ticket para imprimir.");
    return;
  }
  console.log("Datos para impresión:", data);
  // Formato simple para impresión
  const ticketHTML = `
  <div style="font-family:sans-serif; width:76mm; max-width:76mm; font-size:18px; background:#fff; color:#111; margin:0 auto;">
    <h2 style="text-align:center; font-size:24px; margin-bottom:6px;">${data.empresa || ""}</h2>
    <h3 style="text-align:center; font-size:18px; margin-bottom:10px;">Sucursal: ${data.sucursal || ""}</h3>
    <hr style="height:2px; background:#111;">
    <div style="margin-bottom:8px;">
      <b>Ticket #:</b> <span style="font-size:20px;">${data.nro_ticket + " - " + data.reimpresiones || ""}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Tipo:</b> <span style="font-size:20px;">${data.tipo_proceso || ""}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Fecha:</b> <span style="font-size:20px;">${data.fecha || ""} ${data.hora || ""}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Chofer:</b> <span style="font-size:20px;">${data.chofer || ""}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Placa:</b> <span style="font-size:20px;">${data.placa || ""}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Producto:</b> <span style="font-size:20px;">${data.producto || ""}</span>
    </div>
    <hr style="height:2px; background:#111;">
    <div style="margin-bottom:8px;">
      <b>Peso Bruto:</b> <span style="font-size:20px;">${data.peso_bruto + "Kgs" || "N/A"}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Peso Tara:</b> <span style="font-size:20px;">${data.peso_tara + "Kgs" || "N/A"}</span>
    </div>
    <div style="margin-bottom:8px;">
      <b>Peso Neto:</b> <span style="font-size:20px;">${data.peso_neto + "Kgs" || "N/A"}</span>
    </div>
    <hr style="height:2px; background:#111;">
    <div style="text-align:center; font-size:22px; margin-top:12px;">
      <b>¡Gracias por su visita!</b>
    </div>
  </div>
`;

  const win = window.open("", "Ticket", "width=400,height=600");
  win.document.write(ticketHTML);
  win.document.close();

  win.onload = function () {
    win.print();
    // win.close();
  };
}

function renderTable(items) {
  console.log("Renderizando tabla con items:", items);
  let filteredTickets = items.filter(
    (t) => (t.estado || "").toLowerCase() === "en proceso",
  );
  console.log("Renderizando tabla con tickets:", filteredTickets);
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;
  if (!filteredTickets.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No hay tickets en proceso.</td></tr>`;
    return;
  }
  tbody.innerHTML = filteredTickets
    .map((ticket) => {
      const vehiculo = vehiclesList.find((v) => v.id == ticket.id_vehiculo);
      console.log(
        "Renderizando ticket:",
        ticket,
        "Vehículo encontrado:",
        vehiculo,
      );
      return `
      <tr>
        <td>${ticket.nro_ticket || ticket.id}</td>
        <td>${ticket.tipo}</td>
        <td>${ticket.asignacion.vehiculo.placa}</td>
        <td>${ticket.producto.nombre}</td>
        <td>${ticket.asignacion.chofer.persona.nombre + " " + ticket.asignacion.chofer.persona.apellido}</td>
        <td>${ticket.peso_bruto || "Sin peso bruto"}</td>
        <td>${ticket.peso_tara || "Sin peso tara"}</td>
        <td>${ticket.peso_neto || "Sin peso neto"}</td>
        <td>${new Date(ticket.created_at || ticket.fecha_registro).toLocaleString()}</td>
        <td><span style="background:orange; padding:2px 5px; border-radius:4px;">${ticket.estado}</span></td>
        <td>
         ${
           !ticket.peso_neto
             ? `<button class="btn-primary btn-small" data-id="${ticket.id}" data-action="pesar">Registrar Segundo Peso</button>`
             : ""
         }
        ${
          ticket.producto.id === 1 &&
          ticket.tipo === "Entrada" &&
          (ticket.peso_neto > 0 ||
            (ticket.peso_bruto > 0 && ticket.peso_tara > 0))
            ? `<button class="btn-secondary btn-small" data-id="${ticket.id}" data-action="nota">Nota Entrega</button>`
            : ""
        }
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
          ${vehiclesList.map((v) => `<option value="${v.placa}"></option>`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <label>Chofer</label>
        <input list="list-choferes" id="chofer" required>
        <datalist id="list-choferes">
          ${driversList.map((c) => `<option value="${c.persona.nombre} ${c.persona.apellido} - ${c.persona.tipo_cedula}${c.persona.cedula}"></option>`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <label>Producto</label>
        <input list="list-productos" id="producto" required>
        <datalist id="list-productos">
          ${productsList.map((p) => `<option value="${p.codigo} - ${p.nombre}"></option>`).join("")}
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
        const res = await createResource("tickets_pesaje", ticketPayload);
        modal.hide();
        await loadTickets();
        printTicket(res.data.id);
      } catch (err) {
        alert("Error creando ticket: " + (err?.error || err?.message || err));
      }
    };
  });
}

function showSecondWeighModal(ticket) {
  const tipoPeso = ticket.peso_bruto > 0 ? "tara" : "bruto";
  const isEntrada = ticket.tipo === "Entrada";
  const formHTML = `
    <form id="second-weigh-form">
      <div class="form-group" style="display:flex; gap:10px; align-items:end;">
        <div style="flex:1;">
          <label>Peso Bruto</label>
          <input type="number" id="peso-bruto" min="0" step="0.01" value="${ticket.peso_bruto || ""}" ${tipoPeso === "bruto" ? "" : "disabled"}>
          <button type="button" id="btn-get-bruto" class="btn-small" style="margin-top:5px;" ${tipoPeso === "bruto" ? "" : "disabled"}>Leer Báscula</button>
        </div>
        <div style="flex:1;">
          <label>Peso Tara</label>
          <input type="number" id="peso-tara" min="0" step="0.01" value="${ticket.peso_tara || ""}" ${tipoPeso === "tara" ? "" : "disabled"}>
          <button type="button" id="btn-get-tara" class="btn-small" style="margin-top:5px;" ${tipoPeso === "tara" ? "" : "disabled"}>Leer Báscula</button>
        </div>
      </div>
      <div class="modal-footer">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
      </div>
    </form>
  `;

  modal.show(
    `Registrar Segundo Peso (${tipoPeso === "bruto" ? "Bruto" : "Tara"})`,
    formHTML,
    (box) => {
      const inpBruto = box.querySelector("#peso-bruto");
      const inpTara = box.querySelector("#peso-tara");
      const btnBruto = box.querySelector("#btn-get-bruto");
      const btnTara = box.querySelector("#btn-get-tara");

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

      box.querySelector("#btn-cancel").onclick = () => modal.hide();

      box.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        let pesoBruto = parseFloat(inpBruto.value) || 0;
        let pesoTara = parseFloat(inpTara.value) || 0;

        // Validación: Bruto menor que Tara
        if (pesoBruto > 0 && pesoTara > 0 && pesoBruto < pesoTara) {
          const confirmTipo = confirm(
            "El peso bruto es menor que el peso tara.\n¿Está seguro que escogió correctamente el tipo de proceso (Entrada/Salida)?",
          );
          if (!confirmTipo) return;
        }

        try {
          await registerWeigh({
            id: ticket.id,
            peso: tipoPeso === "bruto" ? pesoBruto : pesoTara,
          });
          modal.hide();
          await printTicket(ticket.id);
          await loadTickets();
        } catch (err) {
          alert("Error registrando el segundo peso.");
        }
      };
    },
  );
}

function showNotaEntregaModal(ticketId) {
  modal.show(
    "Registrar Nota de Entrega",
    `
      <form id="form-nota">
        <div style="max-height: 600px; overflow-y: auto; padding-right:5px;">
          <h4 style="margin-bottom:10px;">Datos de Origen</h4>
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label>ID Lote (opcional)</label>
              <input type="number" id="id_lote">
            </div>
            <div>
              <label>Número de Orden</label>
              <input type="text" id="numero_de_orden" required>
            </div>
          </div>
          <div class="form-group" style="margin-top:10px; background:#f8f8f8; padding:10px; border-radius:5px;">
            <h5 style="margin-bottom:5px;">Datos de Lote (si no hay ID)</h5>
            <input type="text" id="lote_codigo" placeholder="Código Lote">
            <input type="date" id="lote_fecha_alojamiento" placeholder="Fecha Alojamiento">
            <input type="number" id="lote_cantidad_aves" placeholder="Cantidad Aves">
            <h5 style="margin:10px 0 5px 0;">Galpón</h5>
            <input type="number" id="galpon_id">
            <input type="text" id="galpon_nro" placeholder="Nro Galpón">
            <input type="number" id="galpon_capacidad" placeholder="Capacidad">
            <h5 style="margin:10px 0 5px 0;">Granja</h5>
            <input type="number" id="granja_id">
            <input type="text" id="granja_nombre" placeholder="Nombre Granja">
            <input type="number" id="granja_id_persona_responsable" placeholder="ID Persona Responsable">
            <h5 style="margin:10px 0 5px 0;">Ubicación</h5>
            <input type="number" id="ubicacion_id">
            <input type="text" id="ubicacion_nombre" placeholder="Nombre Ubicación">
            <input type="text" id="ubicacion_tipo" placeholder="Tipo Ubicación">
            <h5 style="margin:10px 0 5px 0;">Dirección</h5>
            <input type="number" id="direccion_id">
            <input type="text" id="direccion_pais" placeholder="País">
            <input type="text" id="direccion_estado" placeholder="Estado">
            <input type="text" id="direccion_municipio" placeholder="Municipio">
            <input type="text" id="direccion_sector" placeholder="Sector">
            <input type="text" id="direccion_descripcion" placeholder="Descripción">
          </div>
          <hr>
          <h4 style="margin-bottom:10px;">Datos de Conteo</h4>
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <div>
              <label>Aves Guía</label>
              <input type="number" id="aves_guia" required>
            </div>
            <div>
              <label>Aves Recibidas</label>
              <input type="number" id="aves_recibidas" required>
            </div>
            <div>
              <label>Aves Faltantes</label>
              <input type="number" id="aves_faltantes" required>
            </div>
            <div>
              <label>Aves Ahogadas</label>
              <input type="number" id="aves_aho" required>
            </div>
            <div>
              <label>Número de Jaulas</label>
              <input type="number" id="numero_de_jaulas" required>
            </div>
            <div>
              <label>Aves por Jaula</label>
              <input type="number" id="aves_por_jaula" required>
            </div>
          </div>
          <hr>
          <h4 style="margin-bottom:10px;">Tiempos</h4>
          <div class="form-group" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label>Hora Salida Granja</label>
              <input type="datetime-local" id="hora_salida_granja" required>
            </div>
            <div>
              <label>Hora Inicio Descarga</label>
              <input type="datetime-local" id="hora_inicio_descarga" required>
            </div>
            <div>
              <label>Hora Fin Descarga</label>
              <input type="datetime-local" id="hora_fin_descarga" required>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn-primary">Guardar Nota</button>
          <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
        </div>
      </form>
    `,
    (box) => {
      box.querySelector("#btn-cancel").onclick = () => modal.hide();
      box.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();

        // --- Origen anidado, solo incluye si hay datos ---
        const direccion = {};
        const direccionIdInput = box.querySelector("#direccion_id");
        if (direccionIdInput && direccionIdInput.value)
          direccion.id = parseInt(direccionIdInput.value, 10);
        if (box.querySelector("#direccion_pais")?.value)
          direccion.pais = box.querySelector("#direccion_pais").value;
        if (box.querySelector("#direccion_estado")?.value)
          direccion.estado = box.querySelector("#direccion_estado").value;
        if (box.querySelector("#direccion_municipio")?.value)
          direccion.municipio = box.querySelector("#direccion_municipio").value;
        if (box.querySelector("#direccion_sector")?.value)
          direccion.sector = box.querySelector("#direccion_sector").value;
        if (box.querySelector("#direccion_descripcion")?.value)
          direccion.descripcion = box.querySelector(
            "#direccion_descripcion",
          ).value;

        const ubicacion = {};
        const ubicacionIdInput = box.querySelector("#ubicacion_id");
        if (ubicacionIdInput && ubicacionIdInput.value)
          ubicacion.id = parseInt(ubicacionIdInput.value, 10);
        if (box.querySelector("#ubicacion_nombre")?.value)
          ubicacion.nombre = box.querySelector("#ubicacion_nombre").value;
        if (box.querySelector("#ubicacion_tipo")?.value)
          ubicacion.tipo = box.querySelector("#ubicacion_tipo").value;
        if (Object.keys(direccion).length > 0) ubicacion.direccion = direccion;

        const granja = {};
        const granjaIdInput = box.querySelector("#granja_id");
        if (granjaIdInput && granjaIdInput.value)
          granja.id = parseInt(granjaIdInput.value, 10);
        if (box.querySelector("#granja_nombre").value)
          granja.nombre = box.querySelector("#granja_nombre").value;
        if (box.querySelector("#granja_id_persona_responsable").value)
          granja.id_persona_responsable = parseInt(
            box.querySelector("#granja_id_persona_responsable").value,
            10,
          );
        if (Object.keys(ubicacion).length > 0) granja.ubicacion = ubicacion;

        const galpon = {};
        if (box.querySelector("#galpon_id").value)
          galpon.id = parseInt(box.querySelector("#galpon_id").value, 10);
        if (box.querySelector("#galpon_nro").value)
          galpon.nro_galpon = box.querySelector("#galpon_nro").value;
        if (box.querySelector("#galpon_capacidad").value)
          galpon.capacidad = parseInt(
            box.querySelector("#galpon_capacidad").value,
            10,
          );
        if (Object.keys(granja).length > 0) galpon.granja = granja;

        const lote = {};
        if (box.querySelector("#lote_codigo").value)
          lote.codigo_lote = box.querySelector("#lote_codigo").value;
        if (box.querySelector("#lote_fecha_alojamiento").value)
          lote.fecha_alojamiento = box.querySelector(
            "#lote_fecha_alojamiento",
          ).value;
        if (box.querySelector("#lote_cantidad_aves").value)
          lote.cantidad_aves = parseInt(
            box.querySelector("#lote_cantidad_aves").value,
            10,
          );
        if (box.querySelector("#id_lote").value)
          lote.id = parseInt(box.querySelector("#id_lote").value, 10);
        if (Object.keys(galpon).length > 0) lote.galpon = galpon;

        const origen = {};
        if (box.querySelector("#id_lote").value)
          origen.id_lote = parseInt(box.querySelector("#id_lote").value, 10);
        if (box.querySelector("#numero_de_orden").value)
          origen.numero_de_orden = box.querySelector("#numero_de_orden").value;
        if (Object.keys(lote).length > 0) origen.lote = lote;

        const data = {
          conteos: {
            aves_guia: parseInt(box.querySelector("#aves_guia").value, 10),
            aves_recibidas: parseInt(
              box.querySelector("#aves_recibidas").value,
              10,
            ),
            aves_faltantes: parseInt(
              box.querySelector("#aves_faltantes").value,
              10,
            ),
            aves_aho: parseInt(box.querySelector("#aves_aho").value, 10),
            numero_de_jaulas: parseInt(
              box.querySelector("#numero_de_jaulas").value,
              10,
            ),
            aves_por_jaula: parseInt(
              box.querySelector("#aves_por_jaula").value,
              10,
            ),
          },
          hora_salida_granja: box.querySelector("#hora_salida_granja").value,
          hora_inicio_descarga: box.querySelector("#hora_inicio_descarga")
            .value,
          hora_fin_descarga: box.querySelector("#hora_fin_descarga").value,
          origen: Object.keys(origen).length > 0 ? origen : undefined,
        };

        try {
          await saveNotaEntrega(ticketId, data);
          modal.hide();
        } catch (err) {
          alert("Error guardando nota de entrega");
        }
      };
    },
  );
}

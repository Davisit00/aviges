import {
  listResource,
  createResource,
  registerWeigh,
  printTicket,
  saveNotaEntrega,
  getNotaEntrega,
  getUserInfo,
} from "../api.js";
import { modal } from "../components/Modal.js";
import { getSearchInputHTML, setupSearchListener } from "../utils.js";

let allTickets = [];
let vehiclesList = [];
let driversList = [];
let productsList = [];
let currentUser = null;

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
  const [vRes, dRes, pRes] = await Promise.all([
    listResource("vehiculos", { per_page: 1000 }),
    listResource("choferes", { per_page: 1000 }),
    listResource("productos", { per_page: 1000 }),
  ]);
  vehiclesList = vRes.items || vRes.data;
  driversList = dRes.items || dRes.data;
  productsList = pRes.items || pRes.data;
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
      const producto = productsList.find((p) => p.id == ticket.id_producto);
      const chofer = driversList.find((c) => c.id == ticket.id_chofer);
      const pesoInicial =
        ticket.peso_bruto > 0
          ? `Bruto: ${ticket.peso_bruto}`
          : `Tara: ${ticket.peso_tara}`;
      return `
      <tr>
        <td>${ticket.nro_ticket || ticket.id}</td>
        <td>${ticket.tipo_proceso}</td>
        <td>${vehiculo ? vehiculo.placa : ticket.id_vehiculo}</td>
        <td>${producto ? producto.nombre : ticket.id_producto}</td>
        <td>${chofer ? chofer.nombre || chofer.info?.nombre : ticket.id_chofer}</td>
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
  modal.show(
    `Registrar ${tipo}`,
    `
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
          ${productsList.map((p) => `<option value="${p.nombre}">`).join("")}
        </datalist>
      </div>
      <div class="form-group">
        <label>${tipo === "Entrada" ? "Peso Bruto" : "Peso Tara"}</label>
        <input type="number" id="peso" required>
      </div>
      <div class="modal-footer">
        <button type="submit" class="btn-primary">Guardar</button>
        <button type="button" class="btn-secondary" id="btn-cancel">Cancelar</button>
      </div>
    </form>
    `,
    (box) => {
      box.querySelector("#btn-cancel").onclick = () => modal.hide();
      box.querySelector("form").onsubmit = async (e) => {
        e.preventDefault();
        const placa = box.querySelector("#vehiculo").value;
        const choferNombre = box.querySelector("#chofer").value;
        const productoNombre = box.querySelector("#producto").value;
        const peso = parseFloat(box.querySelector("#peso").value);

        const vehiculo = vehiclesList.find((v) => v.placa === placa);
        const chofer = driversList.find(
          (c) => `${c.persona.nombre} ${c.persona.apellido}` === choferNombre,
        );
        const producto = productsList.find((p) => p.nombre === productoNombre);

        if (!vehiculo || !chofer || !producto) {
          alert("Debe seleccionar opciones válidas.");
          return;
        }

        const payload = {
          tipo_proceso: tipo,
          id_vehiculo: vehiculo.id,
          id_chofer: chofer.id,
          id_producto: producto.id,
          id_usuario: currentUser.id,
          peso_bruto: tipo === "Entrada" ? peso : 0,
          peso_tara: tipo === "Salida" ? peso : 0,
          estado: "En Proceso",
        };

        await createResource("tickets_pesaje", payload);
        modal.hide();
        await loadTickets();
      };
    },
  );
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

import {
  listResource,
  getPrintTicketData,
  getReimpresiones,
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
      <h2>Reimpresión de Tickets de Pesaje</h2>
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
    estado: "Finalizado", // O el estado que corresponda a tickets finalizados
    sort: "id",
    order: "desc",
  });
  console.log("Tickets obtenidos para impresión:", res);
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
  console.log("Datos para impresión:", data);
  if (!data) {
    alert("No se pudieron obtener los datos del ticket para imprimir.");
    return;
  }
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
  };
}

function renderTable(items) {
  // Solo mostrar tickets cerrados/finalizados y con ambos pesos
  let filteredTickets = items.filter(
    (t) =>
      (t.estado || "").toLowerCase() === "finalizado" &&
      t.peso_bruto &&
      t.peso_tara &&
      t.peso_neto,
  );
  const tbody = document.getElementById("tickets-tbody");
  if (!tbody) return;
  if (!filteredTickets.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;">No hay tickets finalizados para reimprimir.</td></tr>`;
    return;
  }
  tbody.innerHTML = filteredTickets
    .map((ticket) => {
      return `
      <tr>
        <td>${ticket.nro_ticket || ticket.id}</td>
        <td>${ticket.tipo}</td>
        <td>${ticket.asignacion?.vehiculo?.placa || ""}</td>
        <td>${ticket.producto?.nombre || ""}</td>
        <td>${ticket.asignacion?.chofer?.persona?.nombre || ""} ${ticket.asignacion?.chofer?.persona?.apellido || ""}</td>
        <td>${ticket.peso_bruto || ""}</td>
        <td>${ticket.peso_tara || ""}</td>
        <td>${ticket.peso_neto || ""}</td>
        <td>${new Date(ticket.created_at || ticket.fecha_registro).toLocaleString()}</td>
        <td><span style="background:green; color:#fff; padding:2px 5px; border-radius:4px;">${ticket.estado}</span></td>
        <td>
          <button class="btn-primary btn-small" data-id="${ticket.id}" data-action="reimprimir">Reimprimir</button>
        </td>
      </tr>
      `;
    })
    .join("");

  // Acción de reimpresión
  tbody.querySelectorAll("button[data-action='reimprimir']").forEach((btn) => {
    btn.onclick = () => printTicket(Number(btn.dataset.id));
  });
}

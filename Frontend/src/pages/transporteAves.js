import { getReporteTransporteAves } from "../api.js";

let reporteData = [];

export async function init(container) {
  container.innerHTML = `
    <div class="header-section">
      <h2>Reporte de Transporte de Aves</h2>
      <form id="form-filtros" style="display:flex; gap:10px; align-items:center; margin-bottom:15px;">
        <label>Fecha:
          <input type="date" id="fecha" name="fecha">
        </label>
        <label>Desde:
          <input type="date" id="fecha_inicio" name="fecha_inicio">
        </label>
        <label>Hasta:
          <input type="date" id="fecha_fin" name="fecha_fin">
        </label>
        <button type="submit" class="btn-primary">Buscar</button>
        <button type="button" id="btn-imprimir" class="btn-primary" style="background:#2196F3;">Imprimir</button>
      </form>
      <div class="table-container" style="overflow-x:auto;">
        <table id="reporte-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Estado</th>
              <th>Placa</th>
              <th>Chofer</th>
              <th>Granja</th>
              <th>Galpón</th>
              <th>Fecha Alojamiento</th>
              <th>Edad Aves</th>
              <th>Salida Granja</th>
              <th>Llegada Romana</th>
              <th>Inicio Proceso</th>
              <th>Tiempo Recorrido</th>
              <th>Tiempo Espera</th>
              <th>Aves Contadas</th>
              <th>Aves Faltantes</th>
              <th>% Faltantes</th>
              <th>Aves Ahogadas</th>
              <th>% Ahogadas</th>
              <th>Jaulas</th>
              <th>Aves/Jaula</th>
              <th>Kilos Netos</th>
              <th>Peso Promedio</th>
            </tr>
          </thead>
          <tbody id="reporte-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("form-filtros").onsubmit = async (e) => {
    e.preventDefault();
    await cargarReporte();
  };

  document.getElementById("btn-imprimir").onclick = imprimirReporte;

  await cargarReporte();
}

async function cargarReporte() {
  const fecha = document.getElementById("fecha").value;
  const fecha_inicio = document.getElementById("fecha_inicio").value;
  const fecha_fin = document.getElementById("fecha_fin").value;

  let params = {};
  if (fecha) {
    params.fecha = fecha;
  } else if (fecha_inicio && fecha_fin) {
    params.fecha_inicio = fecha_inicio;
    params.fecha_fin = fecha_fin;
  }

  try {
    const res = await getReporteTransporteAves(params);
    reporteData = res.data || [];
    renderTable(reporteData);
  } catch (err) {
    alert("Error obteniendo el reporte.");
    renderTable([]);
  }
}

function renderTable(data) {
  const tbody = document.getElementById("reporte-tbody");
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="22" style="text-align:center;">No hay datos para mostrar.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (r) => `
      <tr>
        <td>${r.nro_ticket || ""}</td>
        <td>${r.estado || ""}</td>
        <td>${r.placa || ""}</td>
        <td>${r.chofer || ""}</td>
        <td>${r.granja || ""}</td>
        <td>${r.numero_galpon || ""}</td>
        <td>${r.fecha_alojamiento || ""}</td>
        <td>${r.edad_aves || ""}</td>
        <td>${r.hora_salida_granja ? r.hora_salida_granja.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.hora_llegada_romana ? r.hora_llegada_romana.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.hora_inicio_proceso ? r.hora_inicio_proceso.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.tiempo_recorrido || ""}</td>
        <td>${r.tiempo_espera || ""}</td>
        <td>${r.aves_contadas || ""}</td>
        <td>${r.aves_faltantes || ""}</td>
        <td>${Number(r.porcentaje_aves_faltantes || 0).toFixed(2)}%</td>
        <td>${r.aves_ahogadas || ""}</td>
        <td>${Number(r.porcentaje_aves_ahogadas || 0).toFixed(2)}%</td>
        <td>${r.numero_jaulas || ""}</td>
        <td>${r.aves_por_jaula || ""}</td>
        <td>${r.kilos_netos || ""}</td>
        <td>${Number(r.peso_promedio || 0).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("");
}

function imprimirReporte() {
  let html = `
    <html>
    <head>
      <title>Reporte de Transporte de Aves</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #eee; }
      </style>
    </head>
    <body>
      <h2 style="text-align:center;">Reporte de Transporte de Aves</h2>
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Estado</th>
            <th>Placa</th>
            <th>Chofer</th>
            <th>Granja</th>
            <th>Galpón</th>
            <th>Fecha Alojamiento</th>
            <th>Edad Aves</th>
            <th>Salida Granja</th>
            <th>Llegada Romana</th>
            <th>Inicio Proceso</th>
            <th>Tiempo Recorrido</th>
            <th>Tiempo Espera</th>
            <th>Aves Contadas</th>
            <th>Aves Faltantes</th>
            <th>% Faltantes</th>
            <th>Aves Ahogadas</th>
            <th>% Ahogadas</th>
            <th>Jaulas</th>
            <th>Aves/Jaula</th>
            <th>Kilos Netos</th>
            <th>Peso Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${reporteData
            .map(
              (r) => `
            <tr>
              <td>${r.nro_ticket || ""}</td>
              <td>${r.estado || ""}</td>
              <td>${r.placa || ""}</td>
              <td>${r.chofer || ""}</td>
              <td>${r.granja || ""}</td>
              <td>${r.numero_galpon || ""}</td>
              <td>${r.fecha_alojamiento || ""}</td>
              <td>${r.edad_aves || ""}</td>
              <td>${r.hora_salida_granja ? r.hora_salida_granja.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.hora_llegada_romana ? r.hora_llegada_romana.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.hora_inicio_proceso ? r.hora_inicio_proceso.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.tiempo_recorrido || ""}</td>
              <td>${r.tiempo_espera || ""}</td>
              <td>${r.aves_contadas || ""}</td>
              <td>${r.aves_faltantes || ""}</td>
              <td>${Number(r.porcentaje_aves_faltantes || 0).toFixed(2)}%</td>
              <td>${r.aves_ahogadas || ""}</td>
              <td>${Number(r.porcentaje_aves_ahogadas || 0).toFixed(2)}%</td>
              <td>${r.numero_jaulas || ""}</td>
              <td>${r.aves_por_jaula || ""}</td>
              <td>${r.kilos_netos || ""}</td>
              <td>${Number(r.peso_promedio || 0).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
  let win = window.open("", "Reporte", "width=1200,height=800");
  win.document.write(html);
  win.document.close();
  win.onload = function () {
    win.print();
  };
}

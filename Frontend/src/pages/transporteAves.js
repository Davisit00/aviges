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
              <th>Placa</th>
              <th>Chofer</th>
              <th>H. Sal Gja</th>
              <th>H. Entra Rom</th>
              <th>Tiem rec</th>
              <th>Hora Inic</th>
              <th>Tmpo espera</th>
              <th>Granjas</th>
              <th>Aves trans</th>
              <th>Aves cont</th>
              <th>Falt/Sobr</th>
              <th>%</th>
              <th>Kgs</th>
              <th>Peso Prom</th>
              <th>Aves aho</th>
              <th>%</th>
              <th>N Jau</th>
              <th>A jau</th>
              <th>Galp</th>
              <th>Edad</th>
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
    tbody.innerHTML = `<tr><td colspan="20" style="text-align:center;">No hay datos para mostrar.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (r) => `
      <tr>
        <td>${r.placa || ""}</td>
        <td>${r.chofer || ""}</td>
        <td>${r.hora_salida_granja ? r.hora_salida_granja.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.hora_llegada_romana ? r.hora_llegada_romana.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.tiempo_recorrido || "0"}</td>
        <td>${r.hora_inicio_proceso ? r.hora_inicio_proceso.substring(0, 16).replace("T", " ") : ""}</td>
        <td>${r.tiempo_espera || "0"}</td>
        <td>${r.granja || ""}</td>
        <td>${r.aves_contadas !== undefined ? r.aves_contadas + (r.aves_faltantes !== undefined ? r.aves_faltantes : 0) : "0"}</td>
        <td>${r.aves_contadas || "0"}</td>
        <td>${r.aves_faltantes || "0"}</td>
        <td>${Number(r.porcentaje_aves_faltantes || 0).toFixed(2)}%</td>
        <td>${r.kilos_netos || "0"}</td>
        <td>${Number(r.peso_promedio || 0).toFixed(2)}</td>
        <td>${r.aves_ahogadas || "0"}</td>
        <td>${Number(r.porcentaje_aves_ahogadas || 0).toFixed(2)}%</td>
        <td>${r.numero_jaulas || "0"}</td>
        <td>${r.aves_por_jaula || "0"}</td>
        <td>${r.numero_galpon || "0"}</td>
        <td>${r.edad_aves || "0"}</td>
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
        th, td { border: 1px solid #333; padding: 4px 6px; width: fit-content; }
        th { background: #eee; }
      </style>
    </head>
    <body>
      <h2 style="text-align:center;">Reporte de Transporte de Aves</h2>
      <table>
        <thead>
          <tr>
            <th>Placa</th>
            <th>Chofer</th>
            <th>H. Sal Gja</th>
            <th>H. Entra Rom</th>
            <th>Tiem rec</th>
            <th>Hora Inic</th>
            <th>Tmpo espera</th>
            <th>Granjas</th>
            <th>Aves trans</th>
            <th>Aves cont</th>
            <th>Falt/Sobr</th>
            <th>%</th>
            <th>Kgs</th>
            <th>Peso Prom</th>
            <th>Aves aho</th>
            <th>%</th>
            <th>N Jau</th>
            <th>A jau</th>
            <th>Galp</th>
            <th>Edad</th>
          </tr>
        </thead>
        <tbody>
          ${reporteData
            .map(
              (r) => `
            <tr>
              <td>${r.placa || ""}</td>
              <td>${r.chofer || ""}</td>
              <td>${r.hora_salida_granja ? r.hora_salida_granja.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.hora_llegada_romana ? r.hora_llegada_romana.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.tiempo_recorrido || "0"}</td>
              <td>${r.hora_inicio_proceso ? r.hora_inicio_proceso.substring(0, 16).replace("T", " ") : ""}</td>
              <td>${r.tiempo_espera || "0"}</td>
              <td>${r.granja || ""}</td>
              <td>${r.aves_contadas !== undefined ? r.aves_contadas + (r.aves_faltantes !== undefined ? r.aves_faltantes : 0) : ""}</td>
              <td>${r.aves_contadas || "0"}</td>
              <td>${r.aves_faltantes || "0"}</td>
              <td>${Number(r.porcentaje_aves_faltantes || 0).toFixed(2)}%</td>
              <td>${r.kilos_netos || ""}</td>
              <td>${Number(r.peso_promedio || 0).toFixed(2)}</td>
              <td>${r.aves_ahogadas || "0"}</td>
              <td>${Number(r.porcentaje_aves_ahogadas || 0).toFixed(2)}%</td>
              <td>${r.numero_jaulas || "0"}</td>
              <td>${r.aves_por_jaula || "0"}</td>
              <td>${r.numero_galpon || "0"}</td>
              <td>${r.edad_aves || ""}</td>
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

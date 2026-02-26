import { getReporteGranja, listResource } from "../api.js";

let reporteData = [];
let resumenData = null;
let granjasList = [];

export async function init(container) {
  await cargarGranjas();

  container.innerHTML = `
    <div class="header-section">
      <h2>Reporte Diario de Granja</h2>
      <form id="form-filtros" style="display:flex; gap:10px; align-items:center; margin-bottom:15px;">
        <label>Granja:
          <select id="id_ubicacion" name="id_ubicacion" required>
            <option value="">Seleccione...</option>
            ${granjasList
              .map(
                (g) =>
                  `<option value="${g.id}">${g.nombre || g.descripcion || "Granja " + g.id}</option>`,
              )
              .join("")}
          </select>
        </label>
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
      <div id="reporte-resumen"></div>
      <div class="table-container" style="overflow-x:auto;">
        <table id="reporte-table">
          <thead id="reporte-thead"></thead>
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
}

async function cargarGranjas() {
  // Solo ubicaciones tipo Granja
  const res = await listResource("ubicaciones", { per_page: 1000 });
  granjasList = (res.items || res.data || []).filter(
    (u) => (u.tipo || "").toLowerCase() === "granja",
  );
}

async function cargarReporte() {
  const id_ubicacion = document.getElementById("id_ubicacion").value;
  const fecha = document.getElementById("fecha").value;
  const fecha_inicio = document.getElementById("fecha_inicio").value;
  const fecha_fin = document.getElementById("fecha_fin").value;

  if (!id_ubicacion) {
    alert("Seleccione una granja.");
    return;
  }

  let params = { id_granja: id_ubicacion };
  if (fecha) {
    params.fecha = fecha;
  } else if (fecha_inicio && fecha_fin) {
    params.fecha_inicio = fecha_inicio;
    params.fecha_fin = fecha_fin;
  }

  try {
    const res = await getReporteGranja(params);
    resumenData = res.data?.resumen || null;
    reporteData = res.data?.tickets || [];
    renderResumen(resumenData);
    renderTable(reporteData);
  } catch (err) {
    alert("Error obteniendo el reporte.");
    renderResumen(null);
    renderTable([]);
  }
}

function renderResumen(resumen) {
  const resumenDiv = document.getElementById("reporte-resumen");
  if (!resumenDiv) return;
  if (!resumen) {
    resumenDiv.innerHTML = "";
    return;
  }
  resumenDiv.innerHTML = `
    <div style="margin-bottom:10px; background:#f5f5f5; padding:10px; border-radius:6px; display:inline-block;">
      <b>Total Aves:</b> ${resumen.total_aves || 0} &nbsp; | &nbsp;
      <b>Total Peso Neto:</b> ${resumen.total_peso_neto || 0} kg &nbsp; | &nbsp;
      <b>Peso Promedio:</b> ${Number(resumen.peso_promedio || 0).toFixed(2)} kg
    </div>
  `;
}

function renderTable(data) {
  const thead = document.getElementById("reporte-thead");
  const tbody = document.getElementById("reporte-tbody");
  if (!thead || !tbody) return;

  if (!data.length) {
    thead.innerHTML = "";
    tbody.innerHTML = `<tr><td colspan="20" style="text-align:center;">No hay datos para mostrar.</td></tr>`;
    return;
  }

  // Generar encabezados dinámicamente según las claves del primer registro
  const columns = Object.keys(data[0]);
  thead.innerHTML =
    "<tr>" +
    columns.map((col) => `<th>${col.replace(/_/g, " ")}</th>`).join("") +
    "</tr>";

  tbody.innerHTML = data
    .map(
      (row) =>
        "<tr>" +
        columns
          .map(
            (col) =>
              `<td>${row[col] !== null && row[col] !== undefined ? row[col] : ""}</td>`,
          )
          .join("") +
        "</tr>",
    )
    .join("");
}

function imprimirReporte() {
  if (!reporteData.length) {
    alert("No hay datos para imprimir.");
    return;
  }
  const columns = Object.keys(reporteData[0]);
  let resumenHtml = "";
  if (resumenData) {
    resumenHtml = `
      <div style="margin-bottom:10px;">
        <b>Total Aves:</b> ${resumenData.total_aves || 0} &nbsp; | &nbsp;
        <b>Total Peso Neto:</b> ${resumenData.total_peso_neto || 0} kg &nbsp; | &nbsp;
        <b>Peso Promedio:</b> ${Number(resumenData.peso_promedio || 0).toFixed(2)} kg
      </div>
    `;
  }
  let html = `
    <html>
    <head>
      <title>Reporte Diario de Granja</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #eee; }
      </style>
    </head>
    <body>
      <h2 style="text-align:center;">Reporte Diario de Granja</h2>
      ${resumenHtml}
      <table>
        <thead>
          <tr>
            ${columns.map((col) => `<th>${col.replace(/_/g, " ")}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${reporteData
            .map(
              (row) =>
                "<tr>" +
                columns
                  .map(
                    (col) =>
                      `<td>${row[col] !== null && row[col] !== undefined ? row[col] : ""}</td>`,
                  )
                  .join("") +
                "</tr>",
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

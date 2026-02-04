import { listResource, printTicket } from "../api.js";

const getDisplayLabel = (item) => {
  if (!item) return "";
  if (item.nombre_usuario) return item.nombre_usuario;
  if (item.cedula)
    return `${item.cedula} - ${item.nombre || ""} ${item.apellido || ""}`;
  if (item.nombre && item.apellido) return `${item.nombre} ${item.apellido}`;
  if (item.codigo && item.nombre) return `${item.codigo} - ${item.nombre}`;
  if (item.codigo) return item.codigo;
  if (item.nombre) return item.nombre;
  if (item.placa) return item.placa;
  if (item.nro_ticket) return item.nro_ticket;
  return item.id;
};

export const createPrintPage = ({
  title,
  resource,
  fields,
  pageSize = 50,
  onPrint,
} = {}) => {
  const tableId = `${resource}-print-table`;
  const errorId = `${resource}-print-error`;
  const searchId = `${resource}-print-search`;

  const handlePrintTicket = async (id) => {
    try {
      const data = await printTicket(id);
      console.log("Print ticket response:", data);

      if (data && data.data && data.data.ticket_text) {
        // Abrir una ventana emergente simple para imprimir el texto preformateado
        const win = window.open("", "PrintTicket", "width=400,height=600");
        win.document.write(`
          <html>
            <head>
              <title>Imprimir Ticket</title>
              <style>
                body { margin: 0; padding: 10px; font-family: monospace; white-space: pre-wrap; }
              </style>
            </head>
            <body>${data.data.ticket_text}</body>
          </html>
        `);
        win.document.close();
        win.focus();

        // Pequeño retardo para asegurar que cargue antes de abrir diálogo
        setTimeout(() => {
          win.print();
          win.close();
        }, 500);
      } else {
        alert("No se recibieron datos imprimibles.");
      }
    } catch (error) {
      console.log("Something went wrong while printing the ticket:", error);
      alert("Error al intentar imprimir el ticket.");
    }
  };

  return {
    template: `
      <h2>${title}</h2>
      <div id="${errorId}" style="color: red;"></div>

      <div style="margin: 20px 0;">
        <label>
          Buscar: 
          <input type="text" id="${searchId}" placeholder="Buscar ..." style=" width: 250px;">
        </label>
      </div>

      <table id="${tableId}" border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            ${fields
              .filter((f) => f.type !== "password")
              .map((f) => `<th>${f.label}</th>`)
              .join("")}
            <th class="actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `,
    setup() {
      let currentItems = [];

      const table = document.getElementById(tableId);
      const tbody = table.querySelector("tbody");
      const errorEl = document.getElementById(errorId);
      const searchInput = document.getElementById(searchId);

      const setError = (msg) => (errorEl.textContent = msg || "");

      const renderRows = (items) => {
        tbody.innerHTML = "";
        items.forEach((item) => {
          const tr = document.createElement("tr");

          const dataCells = fields
            .filter((f) => f.type !== "password")
            .map((f) => {
              let val = item[f.name] ?? "";
              if (f.name.startsWith("fecha_") && val) {
                val = new Date(val).toLocaleString();
              }
              if (f.name.startsWith("peso_neto")) {
                const p_bruto = parseFloat(item.peso_bruto) || 0;
                const p_tara = parseFloat(item.peso_tara) || 0;
                if (p_bruto > 0 && p_tara > 0) {
                  val =
                    item.peso_neto != null
                      ? parseFloat(item.peso_neto)
                      : Math.abs(p_bruto - p_tara);
                } else {
                  val = 0.0;
                }
              }
              return `<td>${val}</td>`;
            })
            .join("");

          const actionsCell = `
            <td>
              <button data-action="print" data-id="${item.id}">Imprimir</button>
            </td>
          `;

          tr.innerHTML = dataCells + actionsCell;
          tbody.appendChild(tr);
        });
      };

      const load = async () => {
        setError("");
        try {
          const res = await listResource(resource, {
            page: 1,
            per_page: pageSize,
            sort: "id",
            order: "desc",
          });
          currentItems = res.data.items || res.data || [];
          renderRows(currentItems);
        } catch (e) {
          setError(e.message);
        }
      };

      table.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action='print']");
        if (!btn) return;

        const id = btn.dataset.id;
        const item = currentItems.find((i) => i.id == id);
        console.log("Printing item:", item);
        if (!item) return;

        if (typeof onPrint === "function") {
          onPrint(item);
        } else {
          // Usamos la función que conecta con el backend
          handlePrintTicket(id);
        }
      });

      searchInput.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = currentItems.filter((item) =>
          fields.some((f) =>
            String(item[f.name] ?? "")
              .toLowerCase()
              .includes(q),
          ),
        );
        renderRows(filtered);
      });

      load();
    },
  };
};

import { listResource } from "../api.js";

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
        if (!item) return;

        if (typeof onPrint === "function") {
          onPrint(item);
        } else {
          window.print();
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

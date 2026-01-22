import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
} from "../api.js";

export const createCrudPage = ({ title, resource, fields, pageSize = 50 }) => {
  const formId = `${resource}-form`;
  const tableId = `${resource}-table`;
  const errorId = `${resource}-error`;
  const cancelId = `${resource}-cancel`;
  const searchId = `${resource}-search`;

  const renderField = (f) => {
    const type = f.type || "text";
    const readOnly = f.readOnly ? "readonly" : "";
    const hidden = f.hidden ? "hidden" : "";
    if (type === "checkbox") {
      return `
        <label>
          <input type="checkbox" name="${f.name}" ${hidden} />
          ${f.label}
        </label>
      `;
    }
    return `
      <label>
        ${f.label}
        <input type="${type}" name="${f.name}" ${readOnly} ${hidden} />
      </label>
    `;
  };

  return {
    template: `
      <h2>${title}</h2>
      <div id="${errorId}" style="color: red;"></div>
      <form id="${formId}">
        ${fields.map(renderField).join("")}
        <button type="submit">Guardar</button>
        <button type="button" id="${cancelId}">Cancelar</button>
      </form>
      
      <div style="margin: 20px 0;">
        <label>
          Buscar: 
          <input type="text" id="${searchId}" placeholder="Buscar por cualquier campo..." style=" width: 250px;">
        </label>
      </div>

      <table id="${tableId}" border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            ${fields.map((f) => `<th>${f.label}</th>`).join("")}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `,
    setup() {
      let editingId = null;

      const form = document.getElementById(formId);
      const table = document.getElementById(tableId);
      const tbody = table.querySelector("tbody");
      const errorEl = document.getElementById(errorId);
      const cancelBtn = document.getElementById(cancelId);
      const searchInput = document.getElementById(searchId);

      const setError = (msg) => (errorEl.textContent = msg || "");

      const getFormData = () => {
        const data = {};
        fields.forEach((f) => {
          if (f.readOnly || f.name === "id") return;
          const el = form.querySelector(`[name="${f.name}"]`);
          if (!el) return;
          if (f.type === "checkbox") data[f.name] = !!el.checked;
          else data[f.name] = el.value;
        });
        return data;
      };

      const setFormData = (item) => {
        fields.forEach((f) => {
          const el = form.querySelector(`[name="${f.name}"]`);
          if (!el) return;
          if (f.type === "checkbox") el.checked = !!item[f.name];
          else el.value = item[f.name] ?? "";
        });
      };

      const clearForm = () => {
        editingId = null;
        form.reset();
      };

      const renderRows = (items) => {
        tbody.innerHTML = "";
        items.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            ${fields.map((f) => `<td>${item[f.name] ?? ""}</td>`).join("")}
            <td>
              <button data-action="edit" data-id="${item.id}">Editar</button>
              <button data-action="delete" data-id="${item.id}">Eliminar</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      };

      const load = async () => {
        setError("");
        try {
          const res = await listResource(resource, {
            page: 1,
            per_page: pageSize,
          });
          const items = res.data.items || res.data || [];
          renderRows(items);
        } catch (err) {
          setError(err?.response?.data?.error || "Error al cargar");
        }
      };

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setError("");
        const payload = getFormData();
        try {
          if (editingId) {
            await updateResource(resource, editingId, payload);
          } else {
            await createResource(resource, payload);
          }
          clearForm();
          await load();
        } catch (err) {
          setError(err?.response?.data?.error || "Error al guardar");
        }
      });

      cancelBtn.addEventListener("click", () => clearForm());

      table.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;

        if (action === "edit") {
          editingId = id;
          const row = btn.closest("tr");
          const cells = row.querySelectorAll("td");
          fields.forEach((f, i) => {
            const el = form.querySelector(`[name="${f.name}"]`);
            if (!el) return;
            if (f.type === "checkbox")
              el.checked = cells[i].textContent === "True";
            else el.value = cells[i].textContent;
          });
        }

        if (action === "delete") {
          if (!confirm("¿Eliminar registro?")) return;
          try {
            await deleteResource(resource, id);
            await load();
          } catch (err) {
            setError(err?.response?.data?.error || "Error al eliminar");
          }
        }
      });

      searchInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim().toLowerCase();
        const rows = Array.from(tbody.querySelectorAll("tr"));

        rows.forEach((row) => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(query) ? "" : "none";
        });
      });

      load();
    },
  };
};

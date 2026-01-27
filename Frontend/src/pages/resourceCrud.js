import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo, // <--- Importamos getUserInfo
} from "../api.js";

// Helper to determine the resource URL based on the FK field name
const getRelatedResourceName = (fieldName) => {
  const singular = fieldName.replace("id_", "");
  const map = {
    granja: "granjas",
    empresa_transporte: "empresas_transporte",
    galpon: "galpones",
    ticket_pesaje: "tickets_pesaje",
    usuario: "usuarios",
    producto: "productos",
    vehiculo: "vehiculos",
    chofer: "choferes",
    rol: "roles", // <-- Agregado nuevo mapeo para roles
  };
  return map[singular] || singular + "s";
};

// Helper to determine what text to show in the dropdown/table
const getDisplayLabel = (item) => {
  if (!item) return "";
  if (item.nombre_usuario) return item.nombre_usuario;
  // Priorizar cédula antes que nombre solo
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

    // Handle Foreign Keys: Render as Input with Datalist (Searchable)
    if (f.name.startsWith("id_") && !f.hidden) {
      const listId = `list-${f.name}`;
      return `
        <label>
          ${f.label}
          <!-- Input visible para buscar -->
          <input 
            type="text" 
            list="${listId}" 
            id="search-${f.name}"
            placeholder="Escriba para buscar o haga doble click..." 
            ${readOnly ? "disabled" : ""} 
            autocomplete="off"
            style="width: 100%; box-sizing: border-box;"
          >
          <!-- Lista de opciones ocultas -->
          <datalist id="${listId}"></datalist>
          
          <!-- Input oculto que guarda el valor real (ID) -->
          <input type="hidden" name="${f.name}">
        </label>
      `;
    }

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
            ${fields
              .filter((f) => f.type !== "password") // <-- CAMBIO: No mostrar header si es password
              .map((f) => `<th>${f.label}</th>`)
              .join("")}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `,
    setup() {
      let editingId = null;
      let currentItems = [];
      let relatedData = {}; // Stores fetched lists: { fieldName: [items...] }
      let currentUser = null; // <--- Variable para almacenar el usuario actual

      const form = document.getElementById(formId);
      const table = document.getElementById(tableId);
      const tbody = table.querySelector("tbody");
      const errorEl = document.getElementById(errorId);
      const cancelBtn = document.getElementById(cancelId);
      const searchInput = document.getElementById(searchId);

      const fkFields = fields.filter(
        (f) => f.name.startsWith("id_") && !f.hidden,
      );

      const setError = (msg) => (errorEl.textContent = msg || "");

      // Función auxiliar para prellenar el usuario si aplica
      const applyCurrentUser = () => {
        if (!currentUser || editingId) return; // Solo aplicar en creación (no edición)

        const userField = fields.find((f) => f.name === "id_usuario");
        if (userField) {
          const hiddenInput = form.querySelector('input[name="id_usuario"]');
          const searchInput = document.getElementById("search-id_usuario");

          if (hiddenInput) hiddenInput.value = currentUser.id;
          if (searchInput) searchInput.value = getDisplayLabel(currentUser);
        }
      };

      const loadRelatedResources = async () => {
        for (const f of fkFields) {
          const resName = getRelatedResourceName(f.name);
          try {
            const res = await listResource(resName, {
              page: 1,
              per_page: 1000,
            });
            const items = res.data.items || res.data || [];
            relatedData[f.name] = items;

            // Populate the datalist element
            const dataList = document.getElementById(`list-${f.name}`);
            if (dataList) {
              dataList.innerHTML = "";
              items.forEach((item) => {
                const opt = document.createElement("option");
                // En datalist, el value es lo que se muestra en el input de texto
                opt.value = getDisplayLabel(item);
                dataList.appendChild(opt);
              });
            }
          } catch (err) {
            console.error(`Error loading related resource ${resName}`, err);
          }
        }
        // Forzar actualización de la tabla
        if (currentItems.length > 0) {
          renderRows(currentItems);
        }
      };

      // Cargar información del usuario actual si existe el campo id_usuario
      const loadUserInfo = async () => {
        if (fields.some((f) => f.name === "id_usuario")) {
          try {
            const res = await getUserInfo();
            currentUser = res.data;
            applyCurrentUser();
          } catch (err) {
            console.error("Error cargando info de usuario", err);
          }
        }
      };

      // Listener para sincronizar la búsqueda (texto) con el input oculto (ID)
      form.addEventListener("input", (e) => {
        const input = e.target;
        // Solo nos interesa si es uno de los inputs de búsqueda generados
        if (input.id && input.id.startsWith("search-id_")) {
          const fieldName = input.id.replace("search-", "");
          const val = input.value;
          const hiddenInput = form.querySelector(`input[name="${fieldName}"]`);

          if (!val) {
            hiddenInput.value = "";
            return;
          }

          // Buscar el item en la data cargada que coincida con el texto
          const list = relatedData[fieldName] || [];
          const match = list.find((item) => getDisplayLabel(item) === val);

          if (match) {
            hiddenInput.value = match.id;
          } else {
            // Si el usuario escribió algo que no está en la lista exacta, el ID queda vacio
            // (Opcional: podrías dejarlo invalidado o manejar creación dinámica)
            hiddenInput.value = "";
          }
        }
      });

      const getFormData = () => {
        const data = {};
        fields.forEach((f) => {
          if (f.readOnly || f.name === "id") return;
          const el = form.querySelector(`[name="${f.name}"]`);
          if (!el) return;

          if (f.type === "checkbox") {
            data[f.name] = !!el.checked;
          } else {
            // El input hidden ya tendrá el valor correcto (ID) gracias al listener anterior
            if (
              (f.name.startsWith("id_") || f.type === "number") &&
              el.value !== ""
            ) {
              data[f.name] = parseFloat(el.value); // Parsear ID o numero
            } else {
              data[f.name] = el.value;
            }
          }
        });
        return data;
      };

      const setFormData = (item) => {
        fields.forEach((f) => {
          // Checkboxes y campos normales
          const el = form.querySelector(`[name="${f.name}"]`);

          // Caso especial: Foreign Keys (actualizar input visible y oculto)
          if (f.name.startsWith("id_")) {
            const searchInput = document.getElementById(`search-${f.name}`);
            const hiddenInput = form.querySelector(`[name="${f.name}"]`);
            const idVal = item[f.name];

            if (hiddenInput) hiddenInput.value = idVal ?? "";

            if (searchInput && idVal && relatedData[f.name]) {
              const relItem = relatedData[f.name].find((r) => r.id == idVal);
              searchInput.value = relItem ? getDisplayLabel(relItem) : "";
            } else if (searchInput) {
              searchInput.value = "";
            }
            return;
          }

          if (!el) return;

          if (f.type === "password") {
            el.value = "";
            return;
          }

          if (f.type === "checkbox") el.checked = !!item[f.name];
          else el.value = item[f.name] ?? "";
        });
      };

      const clearForm = () => {
        editingId = null;
        form.reset();

        // Limpiar manualmente los inputs de autocompletado (search-*)
        fields.forEach((f) => {
          if (f.name.startsWith("id_")) {
            const searchInput = document.getElementById(`search-${f.name}`);
            const hiddenInput = form.querySelector(`input[name="${f.name}"]`);
            if (searchInput) searchInput.value = "";
            if (hiddenInput) hiddenInput.value = "";
          }
        });

        // Re-aplicar el usuario actual por defecto
        applyCurrentUser();
      };

      const renderRows = (items) => {
        tbody.innerHTML = "";
        items.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            ${fields
              .filter((f) => f.type !== "password") // <-- CAMBIO: No mostrar celda si es password
              .map((f) => {
                let val = item[f.name] ?? "";
                // If it's a key and we have related data, show the label instead of ID
                if (f.name.startsWith("id_") && relatedData[f.name]) {
                  const relItem = relatedData[f.name].find((r) => r.id == val);
                  if (relItem) val = getDisplayLabel(relItem) || val;
                }
                return `<td>${val}</td>`;
              })
              .join("")}
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
          currentItems = res.data.items || res.data || [];
          renderRows(currentItems);
        } catch (err) {
          setError(err?.response?.data?.error || "Error al cargar");
        }
      };

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setError("");
        const payload = getFormData();
        console.log("Creating resource with payload:", payload);
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
          // Find the raw item data to populate form fields (especially IDs for selects)
          const item = currentItems.find((i) => i.id == id);
          if (item) setFormData(item);
        } else if (action === "delete") {
          if (confirm("¿Estás seguro de que quieres eliminar este elemento?")) {
            try {
              await deleteResource(resource, id);
              await load();
            } catch (err) {
              setError(err?.response?.data?.error || "Error al eliminar");
            }
          }
        }
      });

      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = currentItems.filter((item) =>
          fields.some((f) => {
            const val = item[f.name] ?? "";
            return (
              val.toString().toLowerCase().includes(query) ||
              (f.name.startsWith("id_") &&
                relatedData[f.name]?.some((r) =>
                  getDisplayLabel(r).toLowerCase().includes(query),
                ))
            );
          }),
        );
        renderRows(filtered);
      });

      // Initial load
      load();
      loadRelatedResources();
      loadUserInfo(); // <--- Llamada inicial para cargar usuario
    },
  };
};

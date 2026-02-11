import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo,
  getMetadataEnums,
  getWeighFromTruckScale,
} from "../api.js";

/**
 * Base CRUD functionality that can be extended/customized by individual pages
 * This provides the core logic for listing, creating, updating, and deleting resources
 */

// Helper para determinar nombre del recurso (pluralización simple)
export const getRelatedResourceName = (fieldName) => {
  const singular = fieldName.replace("id_", "");
  const map = {
    granja: "granjas",
    empresas_transportes: "empresas_transporte",
    galpon: "galpones",
    galpones: "galpones",
    ticket_pesaje: "tickets_pesaje",
    usuario: "usuarios",
    producto: "productos",
    vehiculo: "vehiculos",
    chofer: "choferes",
    rol: "roles",
    roles: "roles",
    direccion: "direcciones",
    direcciones: "direcciones",
    persona: "personas",
    personas: "personas",
    asignaciones: "asignaciones",
    ubicaciones: "ubicaciones",
    origen: "ubicaciones",
    destino: "ubicaciones",
    lote: "lotes",
    rif: "rif",
  };
  return map[singular] || singular + "s";
};

// Helper visualización labels
export const getDisplayLabel = (item) => {
  if (!item) return "";

  if (item.vehiculo && item.chofer) {
    // Asignacion
    const placa = item.vehiculo.placa || "";
    const nombre = item.chofer.persona ? item.chofer.persona.nombre : "Chofer";
    return `${placa} / ${nombre}`;
  }

  if (item.placa) return item.placa;
  if (item.codigo) return item.codigo;
  if (item.numero) return item.numero;
  if (item.nro_ticket) return item.nro_ticket;
  
  if (item.nombre) {
    if (item.apellido) return `${item.nombre} ${item.apellido}`;
    return item.nombre;
  }
  
  if (item.razon_social) return item.razon_social;
  if (item.tipo && item.numero) return `${item.tipo}-${item.numero}`;
  
  return item.id ? `ID: ${item.id}` : "—";
};

/**
 * Creates the base CRUD page structure
 * Can be called directly or extended by individual pages
 */
export const createBaseCrudPage = ({ 
  title, 
  resource, 
  fields, 
  pageSize = 50,
  // Customization hooks
  customRenderField = null,
  customTableRow = null,
  beforeCreate = null,
  afterCreate = null,
  beforeUpdate = null,
  afterUpdate = null,
  customLoadTable = null,
}) => {
  const formId = `${resource}-form`;
  const tableId = `${resource}-table`;
  const errorId = `${resource}-error`;
  const cancelId = `${resource}-cancel`;
  const searchId = `${resource}-search`;
  const modalId = `${resource}-modal`;

  // Generamos template base
  const renderField = (f) => {
    // Allow custom field rendering
    if (customRenderField) {
      const customResult = customRenderField(f, resource);
      if (customResult !== null) return customResult;
    }

    const type = f.type || "text";
    const readOnly = f.readOnly ? "readonly" : "";
    const hidden = f.hidden ? "hidden" : "";
    const required = f.required ? "required" : "";

    let addonButton = "";
    if (f.captureWeight) {
      addonButton = `<button type="button" class="weigh-capture-btn" data-target="${f.name}" style="margin-left:8px;" disabled>⚖️</button>`;
    }
    if (f.name === "codigo" && resource === "productos") return "";
    if (f.name === "created_at" || f.hidden) return "";

    // FK Field con botón (+)
    if (f.name.startsWith("id_")) {
      const listId = `list-${f.name}`;
      return `
        <label style="display:block; margin-bottom:10px;">
          ${f.label} ${f.required ? '<span style="color:red">*</span>' : ""}
          <div style="display: flex; gap: 8px;">
            <div style="flex: 1;">
              <input type="text" list="${listId}" id="search-${f.name}" placeholder="Buscar..." 
                ${readOnly ? "disabled" : ""} ${required} autocomplete="off" style="width:100%;">
              <datalist id="${listId}"></datalist>
              <input type="hidden" name="${f.name}">
            </div>
            <button type="button" class="create-related-btn" data-field="${f.name}" 
              style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;"
              ${readOnly ? "disabled" : ""} title="Nuevo Registro">+</button>
          </div>
        </label>
      `;
    }

    // AGREGADO: Manejo de Selects para Enums
    if (type === "select") {
      return `
        <label style="display:block; margin-bottom:10px;">
          ${f.label} ${f.required ? '<span style="color:red">*</span>' : ""}
          <select name="${f.name}" data-enum-key="${f.enumKey}" ${readOnly} ${required} style="width:100%; padding: 4px;">
             <option value="">-- Seleccione --</option>
             <option value="" disabled>Cargando opciones...</option>
          </select>
        </label>
      `;
    }

    if (type === "checkbox") {
      return `<label style="display:flex; gap:5px; margin-bottom:10px;">${f.label} <input type="checkbox" name="${f.name}" /></label>`;
    }

    return `
      <label style="display:block; margin-bottom:10px;">
        ${f.label} ${f.required ? '<span style="color:red">*</span>' : ""}
        <div style="display:flex;">
            <input type="${type}" name="${f.name}" ${readOnly} ${required} style="flex:1;" value="${f.defaultValue || ""}" />
            ${addonButton}
        </div>
      </label>
    `;
  };

  return {
    template: `
      <h2>${title}</h2>
      <div id="${errorId}" style="color: red; margin-bottom:10px;"></div>

      <div style="margin: 10px 0;">
        <button id="${resource}-new-btn" style="padding:8px 16px; cursor:pointer;">+ Nueva Entrada</button>
      </div>

      <!-- Main Modal (Level 0) -->
      <div id="${modalId}" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
        <div style="background:white; padding:20px; border-radius:8px; width:500px; max-height:90vh; overflow-y:auto;">
            <h3>${title}</h3>
            <form id="${formId}">
              ${fields.map(renderField).join("")}
              <div style="margin-top:20px; text-align:right;">
                  <button type="button" id="${cancelId}" style="margin-right:10px;">Cancelar</button>
                  <button type="submit" style="background:#4CAF50; color:white; border:none; padding:8px 16px; cursor:pointer;">Guardar</button>
              </div>
            </form>
        </div>
      </div>

      <!-- Table -->
      <table id="${tableId}" border="1" cellpadding="10" style="width:100%; border-collapse:collapse; margin-top:20px;">
        <thead>
          <tr>
            <th>ID</th>
            ${fields.filter((f) => !f.hidden && f.name !== "created_at" && f.name !== "codigo").map((f) => `<th>${f.label}</th>`).join("")}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div id="${resource}-pagination" style="margin-top:10px; text-align:center;"></div>
    `,

    setup: async ({ canCreate = true, canEdit = true, canDelete = true, requiresAdminForEdit = false, readOnly = false, noAccess = false } = {}) => {
      const errorEl = document.getElementById(errorId);

      if (noAccess) {
        if (errorEl) {
          errorEl.textContent = "No tiene permisos para acceder a este recurso";
        }
        return;
      }

      // Apply read-only logic
      let effectiveCanCreate = readOnly ? false : canCreate;
      let effectiveCanEdit = readOnly ? false : canEdit;
      let effectiveCanDelete = readOnly ? false : canDelete;

      let editingId = null;
      let currentItems = [];
      let relatedData = {};
      let enumsData = {};

      const form = document.getElementById(formId);
      const tableBody = document.querySelector(`#${tableId} tbody`);
      const modal = document.getElementById(modalId);

      // --- SISTEMA DE MODALES APILABLES (DYNAMIC MODALS) ---
      const createDynamicModalDOM = (level, title, formHtml, onSave, onCancel) => {
        const div = document.createElement("div");
        div.id = `dynamic-modal-${level}`;
        div.style.cssText = `
            display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: ${10000 + level * 10}; 
            align-items: center; justify-content: center;
         `;

        div.innerHTML = `
            <div style="background:white; padding:20px; border-radius:8px; width:450px; max-height:90vh; overflow-y:auto; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <h3 style="border-bottom:1px solid #eee; padding-bottom:10px;">Nuevo: ${title}</h3>
                <div id="error-${level}" style="color:red; margin-bottom:10px;"></div>
                <form id="form-${level}">
                    ${formHtml}
                    <div style="margin-top:20px; text-align:right; border-top:1px solid #eee; padding-top:15px;">
                        <button type="button" id="cancel-${level}" style="padding:6px 12px; margin-right:8px;">Cancelar</button>
                        <button type="submit" style="padding:6px 12px; background:#4CAF50; color:white; border:none;">Guardar</button>
                    </div>
                </form>
            </div>
         `;

        document.body.appendChild(div);

        const formEl = div.querySelector(`#form-${level}`);
        const cancelBtn = div.querySelector(`#cancel-${level}`);
        const errorDiv = div.querySelector(`#error-${level}`);

        formEl.addEventListener("click", (e) => {
          if (e.target.classList.contains("create-related-btn")) {
            const fieldName = e.target.dataset.field;
            showDynamicModal(fieldName, level + 1, (newRelItem) => {
              updateSelectOptions(formEl, fieldName, newRelItem);
            });
          }
        });

        formEl.addEventListener("submit", async (e) => {
          e.preventDefault();
          errorDiv.textContent = "";
          const formData = new FormData(formEl);
          const data = {};

          for (let [key, val] of formData.entries()) {
            if (key.startsWith("id_")) data[key] = parseInt(val) || null;
            else data[key] = val;
          }

          const targetResource = getRelatedResourceName(title.toLowerCase());
          try {
            const result = await createResource(targetResource, data);
            onSave(result);
            div.remove();
          } catch (err) {
            errorDiv.textContent = err.message || "Error al crear";
          }
        });

        cancelBtn.addEventListener("click", () => {
          onCancel();
          div.remove();
        });
      };

      const updateSelectOptions = (formEl, fieldName, newItem) => {
        const searchInput = formEl.querySelector(`#search-${fieldName}`);
        const hiddenInput = formEl.querySelector(`input[name="${fieldName}"]`);
        const datalistEl = formEl.querySelector(`#list-${fieldName}`);

        if (searchInput && hiddenInput && datalistEl && newItem) {
          const label = getDisplayLabel(newItem);
          searchInput.value = label;
          hiddenInput.value = newItem.id;

          const opt = document.createElement("option");
          opt.value = label;
          opt.dataset.id = newItem.id;
          datalistEl.appendChild(opt);

          const relResource = getRelatedResourceName(fieldName);
          if (!relatedData[relResource]) relatedData[relResource] = [];
          relatedData[relResource].push(newItem);
        }
      };

      const showDynamicModal = (fieldName, level, callback) => {
        const relResource = getRelatedResourceName(fieldName);
        import("./resourceConfigs.js").then(({ resourceConfigs }) => {
          const relConfig = resourceConfigs[relResource];
          if (!relConfig) {
            alert(`No hay configuración para ${relResource}`);
            return;
          }

          const formHtml = relConfig.fields
            .filter((f) => !f.readOnly && !f.hidden && f.name !== "created_at" && f.name !== "codigo")
            .map((f) => renderField(f))
            .join("");

          createDynamicModalDOM(
            level,
            relConfig.title,
            formHtml,
            (newItem) => callback(newItem),
            () => {}
          );

          setTimeout(async () => {
            const dynamicForm = document.querySelector(`#form-${level}`);
            if (!dynamicForm) return;

            relConfig.fields.forEach(async (f) => {
              if (f.name.startsWith("id_")) {
                const relFieldResource = getRelatedResourceName(f.name);
                try {
                  const subItems = await listResource(relFieldResource, 1, 1000);
                  const subDatalist = dynamicForm.querySelector(`#list-${f.name}`);
                  if (subDatalist && subItems.items) {
                    subDatalist.innerHTML = "";
                    subItems.items.forEach((it) => {
                      const opt = document.createElement("option");
                      opt.value = getDisplayLabel(it);
                      opt.dataset.id = it.id;
                      subDatalist.appendChild(opt);
                    });

                    const subSearch = dynamicForm.querySelector(`#search-${f.name}`);
                    const subHidden = dynamicForm.querySelector(`input[name="${f.name}"]`);
                    if (subSearch && subHidden) {
                      subSearch.addEventListener("input", () => {
                        const found = Array.from(subDatalist.options).find(
                          (o) => o.value === subSearch.value
                        );
                        subHidden.value = found ? found.dataset.id : "";
                      });
                    }
                  }
                } catch (e) {
                  console.warn(`No se pudieron cargar sub-items para ${relFieldResource}`, e);
                }
              }

              if (f.type === "select" && f.enumKey) {
                const selectEl = dynamicForm.querySelector(`select[name="${f.name}"]`);
                if (selectEl && enumsData[f.enumKey]) {
                  selectEl.innerHTML = `<option value="">-- Seleccione --</option>`;
                  enumsData[f.enumKey].forEach((val) => {
                    const opt = document.createElement("option");
                    opt.value = val;
                    opt.textContent = val;
                    selectEl.appendChild(opt);
                  });
                }
              }
            });
          }, 100);
        });
      };

      const loadTable = async (page = 1) => {
        try {
          // Allow custom table loading
          if (customLoadTable) {
            await customLoadTable(page, tableBody, currentItems, fields, effectiveCanEdit, effectiveCanDelete);
            return;
          }

          const data = await listResource(resource, page, pageSize);
          currentItems = data.items || [];
          tableBody.innerHTML = "";

          currentItems.forEach((item) => {
            const row = tableBody.insertRow();
            
            // Allow custom table row rendering
            if (customTableRow) {
              row.innerHTML = customTableRow(item, fields, effectiveCanEdit, effectiveCanDelete);
              return;
            }

            // Default row rendering
            row.innerHTML = `
              <td>${item.id || "—"}</td>
              ${fields
                .filter((f) => !f.hidden && f.name !== "created_at" && f.name !== "codigo")
                .map((f) => {
                  let val = item[f.name];
                  if (f.name.startsWith("id_")) {
                    const relName = f.name.replace("id_", "");
                    val = item[relName] ? getDisplayLabel(item[relName]) : val || "—";
                  }
                  if (f.type === "checkbox") val = val ? "Sí" : "No";
                  return `<td>${val || "—"}</td>`;
                })
                .join("")}
              <td>
                ${effectiveCanEdit ? `<button class="edit-btn" data-id="${item.id}">Editar</button>` : ""}
                ${effectiveCanDelete ? `<button class="delete-btn" data-id="${item.id}">Eliminar</button>` : ""}
              </td>
            `;
          });

          const paginationDiv = document.getElementById(`${resource}-pagination`);
          if (paginationDiv && data.total_pages > 1) {
            let paginationHTML = "";
            for (let p = 1; p <= data.total_pages; p++) {
              paginationHTML += `<button ${p === page ? 'disabled' : ''} onclick="window.${resource}LoadPage(${p})">${p}</button> `;
            }
            paginationDiv.innerHTML = paginationHTML;
          }
        } catch (e) {
          if (errorEl) errorEl.textContent = e.message || "Error al cargar datos";
        }
      };

      window[`${resource}LoadPage`] = loadTable;

      const loadRelated = async () => {
        for (const f of fields) {
          if (f.name.startsWith("id_")) {
            const relResource = getRelatedResourceName(f.name);
            try {
              const data = await listResource(relResource, 1, 1000);
              relatedData[relResource] = data.items || [];

              const datalistEl = document.getElementById(`list-${f.name}`);
              const searchInput = document.getElementById(`search-${f.name}`);
              const hiddenInput = form.querySelector(`input[name="${f.name}"]`);

              if (datalistEl) {
                datalistEl.innerHTML = "";
                relatedData[relResource].forEach((it) => {
                  const opt = document.createElement("option");
                  opt.value = getDisplayLabel(it);
                  opt.dataset.id = it.id;
                  datalistEl.appendChild(opt);
                });
              }

              if (searchInput && hiddenInput) {
                searchInput.addEventListener("input", () => {
                  const found = Array.from(datalistEl.options).find(
                    (o) => o.value === searchInput.value
                  );
                  hiddenInput.value = found ? found.dataset.id : "";
                });
              }
            } catch (e) {
              console.warn(`No se pudieron cargar datos para ${relResource}`, e);
            }
          }
        }
      };

      const loadEnums = async () => {
        try {
          enumsData = await getMetadataEnums();
          fields.forEach((f) => {
            if (f.type === "select" && f.enumKey) {
              const selectEl = form.querySelector(`select[name="${f.name}"]`);
              if (selectEl && enumsData[f.enumKey]) {
                selectEl.innerHTML = `<option value="">-- Seleccione --</option>`;
                enumsData[f.enumKey].forEach((val) => {
                  const opt = document.createElement("option");
                  opt.value = val;
                  opt.textContent = val;
                  selectEl.appendChild(opt);
                });
              }
            }
          });
        } catch (e) {
          console.warn("No se pudieron cargar los enums", e);
        }
      };

      const newBtn = document.getElementById(`${resource}-new-btn`);
      if (newBtn) {
        if (!effectiveCanCreate) {
          newBtn.style.display = 'none';
        } else {
          newBtn.addEventListener("click", () => {
            editingId = null;
            form.reset();
            modal.style.display = "flex";
          });
        }
      }
      
      document.getElementById(cancelId)?.addEventListener("click", () => (modal.style.display = "none"));

      tableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("edit-btn")) {
          const id = e.target.dataset.id;
          const item = currentItems.find((x) => x.id == id);
          if (item) {
            editingId = id;
            fields.forEach((f) => {
              if (f.name.startsWith("id_")) {
                const searchInput = document.getElementById(`search-${f.name}`);
                const hiddenInput = form.querySelector(`input[name="${f.name}"]`);
                if (searchInput && hiddenInput) {
                  const relName = f.name.replace("id_", "");
                  const relItem = item[relName];
                  searchInput.value = relItem ? getDisplayLabel(relItem) : "";
                  hiddenInput.value = item[f.name] || "";
                }
              } else {
                const el = form.querySelector(`[name="${f.name}"]`);
                if (el) {
                  if (el.tagName === "SELECT" && el.dataset.enumKey) {
                    el.value = item[f.name];
                  }
                  if (el.type === "checkbox") el.checked = item[f.name];
                  else el.value = item[f.name];
                }
              }
            });
            modal.style.display = "flex";
          }
        }

        if (e.target.classList.contains("delete-btn")) {
          if (confirm("¿Eliminar este registro?")) {
            const id = e.target.dataset.id;
            deleteResource(resource, id)
              .then(() => loadTable())
              .catch((err) => {
                if (errorEl) errorEl.textContent = err.message || "Error al eliminar";
              });
          }
        }
      });

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = "";

        const formData = new FormData(form);
        const data = {};

        for (let [key, val] of formData.entries()) {
          if (key.startsWith("id_")) data[key] = parseInt(val) || null;
          else if (form.querySelector(`[name="${key}"]`)?.type === "checkbox")
            data[key] = form.querySelector(`[name="${key}"]`).checked;
          else data[key] = val;
        }

        try {
          // Call before create/update hooks
          if (editingId) {
            if (beforeUpdate) await beforeUpdate(data, editingId);
            
            // Check if admin credentials required
            if (requiresAdminForEdit) {
              const { showAdminCredentialModal } = await import("../utils.js");
              const validated = await showAdminCredentialModal();
              if (!validated) return;
            }

            await updateResource(resource, editingId, data);
            if (afterUpdate) await afterUpdate(data, editingId);
          } else {
            if (beforeCreate) await beforeCreate(data);
            await createResource(resource, data);
            if (afterCreate) await afterCreate(data);
          }

          modal.style.display = "none";
          form.reset();
          await loadTable();
        } catch (err) {
          if (errorEl) errorEl.textContent = err.message || "Error al guardar";
        }
      });

      // Start
      loadTable();
      loadRelated();
      loadEnums();
    },
  };
};

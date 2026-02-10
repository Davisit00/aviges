import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo,
  getMetadataEnums, // <--- AGREGAR ESTO
  getWeighFromTruckScale,
} from "../api.js";
import { resourceConfigs } from "./resourceConfigs.js";

// Helper para determinar nombre del recurso (pluralización simple)
const getRelatedResourceName = (fieldName) => {
  const singular = fieldName.replace("id_", "");
  const map = {
    granja: "granjas",
    empresas_transportes: "empresas_transporte",
    galpon: "galpones",
    galpones: "galpones",
    ticket_pesaje: "tickets_pesaje",
    usuario: "usuarios", // ya no combined
    producto: "productos",
    vehiculo: "vehiculos",
    chofer: "choferes", // ya no combined
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
  };
  return map[singular] || singular + "s";
};

// Helper visualización labels
const getDisplayLabel = (item) => {
  if (!item) return "";

  if (item.vehiculo && item.chofer) {
    // Asignacion
    const placa = item.vehiculo.placa || "";
    const nombre = item.chofer.persona ? item.chofer.persona.nombre : "Chofer";
    return `${placa} / ${nombre}`;
  }

  // Fallbacks genéricos
  if (item.numero && item.tipo) return `${item.tipo}: ${item.numero}`; // <--- NUEVO PARA TELEFONOS
  if (item.cedula)
    return `${item.cedula} - ${item.nombre || ""} ${item.apellido || ""}`;
  if (item.nombre && item.apellido) return `${item.nombre} ${item.apellido}`;
  if (item.usuario) return item.usuario;
  if (item.codigo && item.nombre) return `${item.codigo} - ${item.nombre}`;
  if (item.rif) return `${item.rif} - ${item.nombre}`;
  if (item.placa) return item.placa;
  if (item.nro_ticket) return item.nro_ticket;
  if (item.nombre) return item.nombre; // Ubicaciones, Roles, etc.
  if (item.descripcion) return `${item.estado || ""} - ${item.descripcion}`; // Direcciones
  if (item.pais && item.estado) return `${item.estado}, ${item.municipio}`; // Direcciones fallback

  return item.id;
};

export const createCrudPage = ({ title, resource, fields, pageSize = 50 }) => {
  const formId = `${resource}-form`;
  const tableId = `${resource}-table`;
  const errorId = `${resource}-error`;
  const cancelId = `${resource}-cancel`;
  const searchId = `${resource}-search`;
  const modalId = `${resource}-modal`; // Modal Principal

  // Generamos template base
  const renderField = (f) => {
    const type = f.type || "text";
    const readOnly = f.readOnly ? "readonly" : "";
    const hidden = f.hidden ? "hidden" : "";
    const required = f.required ? "required" : "";

    let addonButton = "";
    if (f.captureWeight) {
      addonButton = `<button type="button" class="weigh-capture-btn" data-target="${f.name}" style="margin-left:8px;" disabled>⚖️</button>`;
    }
    if (f.name === "codigo" && resource === "productos") return ""; // Ocultar campo código en productos (se genera automáticamente){
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
                  <button type="submit">Guardar</button>
              </div>
            </form>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <input type="text" id="${searchId}" placeholder="Buscar en tabla..." style="padding:6px; width: 250px;">
      </div>

      <table id="${tableId}" border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            ${fields
              .filter(
                (f) =>
                  !f.hidden &&
                  f.type !== "password" &&
                  !f.name.startsWith("created"),
              )
              .map((f) => `<th>${f.label}</th>`)
              .join("")}
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `,
    setup({ readOnly = false, canCreate = true, canEdit = true } = {}) {
      if (readOnly && resource !== "tickets_pesaje") {
        canCreate = false;
        canEdit = false;
      }

      let editingId = null;
      let currentItems = [];
      let relatedData = {}; // Cache de FKs { id_personas: [...], id_roles: [...] }
      let enumsData = {}; // Cache de Enums

      const form = document.getElementById(formId);
      const tableBody = document.querySelector(`#${tableId} tbody`);
      const modal = document.getElementById(modalId);
      const errorEl = document.getElementById(errorId);

      // --- SISTENA DE MODALES APILABLES (DYNAMIC MODALS) ---

      // Función para crear un modal HTML dinámicamente
      const createDynamicModalDOM = (
        level,
        title,
        formHtml,
        onSave,
        onCancel,
      ) => {
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

        // Setup Eventos del Modal Dinámico

        // 1. Click en "+" dentro de este modal (Recursividad)
        formEl.addEventListener("click", (e) => {
          if (e.target.classList.contains("create-related-btn")) {
            const fieldName = e.target.dataset.field;
            showDynamicModal(fieldName, level + 1, (newRelItem) => {
              // Al volver de la recursión, actualizamos el select de ESTE modal
              updateSelectOptions(formEl, fieldName, newRelItem);
            });
          }
        });

        // 2. Submit
        formEl.addEventListener("submit", async (e) => {
          e.preventDefault();
          errorDiv.textContent = "";
          const formData = new FormData(formEl);
          const data = {};

          // Parseo básico de datos
          for (let [key, val] of formData.entries()) {
            if (key.startsWith("id_")) data[key] = parseInt(val) || null;
            else if (
              formEl.querySelector(`[name="${key}"]`).type === "checkbox"
            )
              data[key] = true;
            else if (formEl.querySelector(`[name="${key}"]`).type === "number")
              data[key] = parseFloat(val);
            else data[key] = val;
          }
          // Checkbox no checkeados
          formEl.querySelectorAll('input[type="checkbox"]').forEach((ck) => {
            if (!ck.checked) data[ck.name] = false;
          });

          try {
            await onSave(data);
            document.body.removeChild(div);
          } catch (err) {
            errorDiv.textContent = err.message || "Error al guardar";
          }
        });

        // 3. Cancel
        cancelBtn.addEventListener("click", () => {
          document.body.removeChild(div);
          if (onCancel) onCancel();
        });
      };

      // Lógica Principal para abrir modal nuevo
      const showDynamicModal = async (fieldName, level, callbackSuccess) => {
        const resName = getRelatedResourceName(fieldName);
        const config = resourceConfigs[resName];

        if (!config) {
          alert(`Error: No hay confguración para ${resName}`);
          return;
        }

        // Cargar datos relacionados para los selects de ESTE nuevo modal
        const nestedRelated = {};
        const nestedFkFields = config.fields.filter((f) =>
          f.name.startsWith("id_"),
        );

        for (const f of nestedFkFields) {
          try {
            const relRes = getRelatedResourceName(f.name);
            const r = await listResource(relRes, { page: 1, per_page: 1000 });
            nestedRelated[f.name] = r.data.items || r.data || [];
          } catch (ex) {
            console.warn(ex);
          }
        }

        // Construir HTML del formulario
        const formHtml = config.fields
          .map((f) => {
            if (f.readOnly || f.hidden || f.name === "id") return "";
            const isReq =
              f.required || f.name === "nombre" || f.name === "rif"
                ? "required"
                : "";

            if (f.name.startsWith("id_")) {
              // Renderizar Select o Datalist
              const items = nestedRelated[f.name] || [];
              const options = items
                .map(
                  (i) =>
                    `<option value="${i.id}">${getDisplayLabel(i)}</option>`,
                )
                .join("");
              return `
                    <label style="display:block; margin-bottom:10px;">
                        ${f.label} <span style="color:red">*</span>
                        <div style="display:flex; gap:5px;">
                            <select name="${f.name}" style="flex:1;" ${isReq}>
                                <option value="">-- Seleccione --</option>
                                ${options}
                            </select>
                            <button type="button" class="create-related-btn" data-field="${f.name}" style="padding:0 8px;">+</button>
                        </div>
                    </label>
                  `;
            }

            // AGREGADO: Renderizar Selects en Modales Dinámicos
            if (f.type === "select") {
              const opts = enumsData[f.enumKey] || [];
              const optionsHtml = opts
                .map((val) => `<option value="${val}">${val}</option>`)
                .join("");
              return `
                 <label style="display:block; margin-bottom:10px;">
                    ${f.label}
                    <select name="${f.name}" style="width:100%;" ${isReq}>
                        <option value="">-- Seleccione --</option>
                        ${optionsHtml}
                    </select>
                 </label>
               `;
            }

            if (f.type === "checkbox")
              return `<label><input type="checkbox" name="${f.name}"> ${f.label}</label><br>`;

            return `
                 <label style="display:block; margin-bottom:10px;">
                    ${f.label}
                    <input type="${f.type || "text"}" name="${f.name}" style="width:100%;" ${isReq}>
                 </label>
              `;
          })
          .join("");

        createDynamicModalDOM(
          level,
          config.title,
          formHtml,
          async (dataPayload) => {
            // On Save Acción
            console.log(`Creando ${resName}`, dataPayload);
            const res = await createResource(resName, dataPayload);
            const newItem = res.data;
            callbackSuccess(newItem);
          },
        );
      };

      // Helper para actualizar inputs en el DOM tras crear algo
      const updateSelectOptions = (formContext, fieldName, newItem) => {
        // Si es input+datalist (Modal Principal)
        const dataList = formContext.querySelector(`#list-${fieldName}`);
        const hiddenInput = formContext.querySelector(
          `input[name="${fieldName}"]`,
        );
        const searchInput = formContext.querySelector(`#search-${fieldName}`);

        if (dataList && searchInput) {
          const opt = document.createElement("option");
          opt.value = getDisplayLabel(newItem);
          dataList.appendChild(opt);

          // Auto-seleccionar
          searchInput.value = getDisplayLabel(newItem);
          if (hiddenInput) hiddenInput.value = newItem.id;

          // Actualizar cache local
          if (!relatedData[fieldName]) relatedData[fieldName] = [];
          relatedData[fieldName].push(newItem);
          return;
        }

        // Si es select simple (Modal Dinámico)
        const select = formContext.querySelector(`select[name="${fieldName}"]`);
        if (select) {
          const opt = document.createElement("option");
          opt.value = newItem.id;
          opt.textContent = getDisplayLabel(newItem);
          opt.selected = true;
          select.appendChild(opt);
        }
      };

      // --- FIN SISTEMA MODALES ---

      // Listeners del Formulario Principal
      if (form) {
        form.addEventListener("click", (e) => {
          if (e.target.classList.contains("create-related-btn")) {
            const fieldName = e.target.dataset.field;
            // Nivel 0 es principal, así que abrimos Nivel 1
            showDynamicModal(fieldName, 1, (newItem) => {
              updateSelectOptions(form, fieldName, newItem);
            });
          }
        });

        // Sync search input with hidden id input
        form.addEventListener("input", (e) => {
          if (e.target.id && e.target.id.startsWith("search-id_")) {
            const field = e.target.id.replace("search-", "");
            const val = e.target.value;
            const list = relatedData[field] || [];
            const hidden = form.querySelector(`input[name="${field}"]`);

            const match = list.find((l) => getDisplayLabel(l) === val);
            hidden.value = match ? match.id : "";
          }
        });

        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = {};

          fields.forEach((f) => {
            if (f.readOnly) return;
            if (f.name.startsWith("id_")) {
              const v = formData.get(f.name); // Toma value del hidden
              if (v) data[f.name] = parseInt(v);
            } else {
              const el = form.querySelector(`[name="${f.name}"]`);
              if (!el) return;

              // --- CORRECCIÓN: Leer valores del DOM hacia data (antes intentaba asignar usando 'item') ---
              if (el.type === "checkbox") {
                data[f.name] = el.checked;
              } else if (f.type === "number" || el.type === "number") {
                data[f.name] = el.value ? parseFloat(el.value) : null;
              } else {
                data[f.name] = el.value;
              }
              // -----------------------------------------------------------------------------------------
            }
          });

          // Submit logic normal...
          try {
            if (editingId) await updateResource(resource, editingId, data);
            else await createResource(resource, data);

            modal.style.display = "none";
            loadTable();
            form.reset();
            editingId = null;
          } catch (err) {
            errorEl.textContent = err.response?.data?.error || err.message;
          }
        });
      }

      // Carga inicial de datos
      const loadTable = async () => {
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
          errorEl.textContent = e.message;
        }
      };

      const renderRows = (items) => {
        tableBody.innerHTML = items
          .map(
            (item) => `
            <tr>
               ${fields
                 .filter(
                   (f) =>
                     !f.hidden &&
                     f.type !== "password" &&
                     !f.name.startsWith("created"),
                 )
                 .map((f) => {
                   let val = item[f.name];
                   if (f.name.startsWith("id_")) {
                     // Resolver nombre desde cache
                     if (relatedData[f.name]) {
                       const r = relatedData[f.name].find((x) => x.id == val);
                       if (r) val = getDisplayLabel(r);
                     }
                   }
                   return `<td>${val || ""}</td>`;
                 })
                 .join("")}
               <td>
                 <button class="edit-btn" data-id="${item.id}">Editar</button>
               </td>
            </tr>
          `,
          )
          .join("");
      };

      const loadRelated = async () => {
        const fk = fields.filter((f) => f.name.startsWith("id_"));
        for (const f of fk) {
          const rName = getRelatedResourceName(f.name);
          try {
            const res = await listResource(rName, { page: 1, per_page: 1000 });
            const items = res.data.items || res.data || [];
            relatedData[f.name] = items;

            // Llenar datalists del formulario principal
            const dl = document.getElementById(`list-${f.name}`);
            if (dl) {
              dl.innerHTML = items
                .map((i) => `<option value="${getDisplayLabel(i)}"></option>`)
                .join("");
            }
          } catch (e) {
            console.warn("Err loading related", rName);
          }
        }
        if (currentItems.length > 0) renderRows(currentItems);
      };

      // Nuevo: Cargar Metadatos de Enums
      const loadEnums = async () => {
        try {
          const res = await getMetadataEnums();
          enumsData = res.data;

          // Actualizar selects del formulario principal
          const selects = document.querySelectorAll(
            `#${formId} select[data-enum-key]`,
          );
          selects.forEach((sel) => {
            const key = sel.dataset.enumKey;
            if (enumsData[key]) {
              const val = sel.value; // preservar valor si hubiera
              sel.innerHTML =
                '<option value="">-- Seleccione --</option>' +
                enumsData[key]
                  .map((op) => `<option value="${op}">${op}</option>`)
                  .join("");
              if (val) sel.value = val;
            }
          });
        } catch (e) {
          console.warn("No se pudieron cargar los enums", e);
        }
      };

      // Init Events
      document
        .getElementById(`${resource}-new-btn`)
        ?.addEventListener("click", () => {
          editingId = null;
          form.reset();
          modal.style.display = "flex";
        });
      document
        .getElementById(cancelId)
        ?.addEventListener("click", () => (modal.style.display = "none"));
      tableBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("edit-btn")) {
          const id = e.target.dataset.id;
          const item = currentItems.find((x) => x.id == id);
          if (item) {
            editingId = id;
            // Populate form
            fields.forEach((f) => {
              if (f.name.startsWith("id_")) {
                form.querySelector(`input[name="${f.name}"]`).value =
                  item[f.name];
                const rel = relatedData[f.name]?.find(
                  (r) => r.id == item[f.name],
                );
                if (rel)
                  document.getElementById(`search-${f.name}`).value =
                    getDisplayLabel(rel);
              } else {
                const el = form.querySelector(`[name="${f.name}"]`);
                if (el) {
                  if (el.tagName === "SELECT" && el.dataset.enumKey) {
                    // Asegura que el valor se seleccione incluso si se carga asíncrono
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
      });

      // Start
      loadTable();
      loadRelated();
      loadEnums(); // <--- Llamada
    },
  };
};

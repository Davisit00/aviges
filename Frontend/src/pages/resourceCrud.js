import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo,
  getWeighFromTruckScale,
} from "../api.js";
import { resourceConfigs } from "./resourceConfigs.js";

// Helper to determine the resource URL based on the FK field name
const getRelatedResourceName = (fieldName) => {
  const singular = fieldName.replace("id_", "");
  const map = {
    granja: "granjas",
    empresas_transportes: "empresas_transporte",
    galpon: "galpones",
    galpones: "galpones",
    ticket_pesaje: "tickets_pesaje",
    ticket: "tickets_pesaje",
    usuarios_primer_peso: "combined/usuarios",
    usuarios_segundo_peso: "combined/usuarios",
    usuario: "combined/usuarios",
    producto: "productos",
    vehiculo: "vehiculos",
    vehiculos: "vehiculos",
    chofer: "combined/choferes",
    choferes: "combined/choferes",
    roles: "roles",
    rol: "roles",
    personas: "personas",
    asignaciones: "asignaciones",
    ubicaciones: "ubicaciones",
    origen: "ubicaciones",
    destino: "ubicaciones",
    lote: "lotes",
  };
  return map[singular] || singular + "s";
};

// Helper to determine what text to show in the dropdown/table
const getDisplayLabel = (item) => {
  if (!item) return "";
  // Handle combined endpoint responses with persona data
  if (item.persona) {
    const persona = item.persona;
    return `${persona.cedula || ""} - ${persona.nombre || ""} ${persona.apellido || ""}`.trim();
  }
  // Handle combined endpoint responses with ubicacion data
  if (item.ubicacion) {
    return item.ubicacion.nombre || item.id;
  }
  // Legacy field support
  if (item.usuario) return item.usuario;
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
  const modalId = `${resource}-modal`;

  // Configuración específica para formularios densos
  const isComplexForm = resource === "detalles_transporte_aves";
  const modalWidth = isComplexForm ? "800px" : "500px";
  const formStyle = isComplexForm ? "grid-template-columns: 1fr 1fr;" : "";
  // Si es complejo, reseteamos el span para que quepan 2 en una fila. Si no, dejamos que el CSS global aplique (full width)
  const labelStyleExtra = isComplexForm ? "grid-column: span 1;" : "";

  const renderField = (f) => {
    const type = f.type || "text";
    const readOnly = f.readOnly ? "readonly" : "";
    const hidden = f.hidden ? "hidden" : "";

    // Agregamos lógica para botón de pesaje
    let addonButton = "";
    if (f.captureWeight) {
      addonButton = `
            <button type="button" class="weigh-capture-btn" data-target="${f.name}" style="margin-left:8px; cursor:pointer;" disabled>
               ⚖️ Capturar
            </button>
        `;
    }
    if (f.name === "created_at" || f.name.endsWith(".created_at") || f.label === "Fecha") return "";

    if (f.name.startsWith("id_") && !f.hidden) {
      const listId = `list-${f.name}`;
      return `
        <label style="${labelStyleExtra}">
          ${f.label}
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
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
            </div>
            <button 
              type="button" 
              class="create-related-btn" 
              data-field="${f.name}"
              style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;"
              ${readOnly ? "disabled" : ""}
            >
              + Nuevo
            </button>
          </div>
        </label>
      `;
    }

    if (type === "checkbox") {
      return `<label style="display: flex; flex-direction: row; align-items: center; gap: 5px; ${labelStyleExtra}">${f.label} <input type="checkbox" name="${f.name}" ${hidden} /> </label>`;
    }

    // Renderizado estándar con posible botón addon
    return `
      <label style="${labelStyleExtra}">
        ${f.label}
        <div style="display:flex; align-items:center;">
            <input type="${type}" name="${f.name}" ${readOnly} ${hidden} style="flex:1;" />
            ${addonButton}
        </div>
      </label>
    `;
  };

  return {
    template: `
      <h2>${title}</h2>
      <div id="${errorId}" style="color: red;"></div>

      <div style="margin: 10px 0;">
        <button id="${resource}-new-btn">+ Nueva Entrada</button>
      </div>

      <div id="${modalId}" style="display:none; background: white; opacity: 1 !important; height: auto; max-height: 600px; width: ${modalWidth}; margin: 5% auto; padding: 20px; border-radius: 8px; overflow-y: auto;">
        <form id="${formId}" style="${formStyle}">
          ${fields.map(renderField).join("")}
          <button type="button" id="${cancelId}">Cancelar</button>
          <button type="submit">Guardar</button>
        </form>
      </div>

      <!-- Nested Modal for Creating Related Entities -->
      <div id="${resource}-nested-modal" style="display:none; background: white; opacity: 1 !important; width: 50%; margin: 10% auto; padding: 20px; border-radius: 8px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000001;">
        <h3 id="${resource}-nested-title">Crear Nuevo</h3>
        <div id="${resource}-nested-error" style="color: red; margin-bottom: 10px;"></div>
        <form id="${resource}-nested-form">
          <!-- Dynamic fields will be inserted here -->
        </form>
        <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end;">
          <button type="button" id="${resource}-nested-cancel" style="padding: 8px 16px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
          <button type="button" id="${resource}-nested-save" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Guardar</button>
        </div>
      </div>
      
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
              .filter(
                (f) =>
                  f.type !== "password" &&
                  f.name !== "fecha_registro" &&
                  f.label !== "Fecha",
              )
              .map((f) => `<th>${f.label}</th>`)
              .join("")}
            <th class="actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `,
    setup({
      readOnly = false,
      canCreate = true,
      canEdit = true,
      canDelete = true,
    } = {}) {
      // Si es readOnly estricto (no tickets), bloqueamos todo
      if (readOnly && resource !== "tickets_pesaje") {
        canCreate = false;
        canEdit = false;
        canDelete = false;
      }

      let editingId = null;
      let currentItems = [];
      let relatedData = {};
      let currentUser = null;

      const form = document.getElementById(formId);
      const table = document.getElementById(tableId);
      const tbody = table.querySelector("tbody");
      const errorEl = document.getElementById(errorId);
      const cancelBtn = document.getElementById(cancelId);
      const searchInput = document.getElementById(searchId);
      const submitBtn = form
        ? form.querySelector('button[type="submit"]')
        : null;

      const fkFields = fields.filter(
        (f) => f.name.startsWith("id_") && !f.hidden,
      );

      const weighButtons = form
        ? form.querySelectorAll(".weigh-capture-btn")
        : [];

      const overlay = document.getElementById("modal-overlay");
      const modal = document.getElementById(modalId);

      if (overlay && modal && modal.parentElement !== overlay) {
        overlay.appendChild(modal);

        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.display = "none";
        overlay.style.alignItems = "flex-start";
        overlay.style.justifyContent = "center";
        overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
        overlay.style.opacity = "1";
        overlay.style.zIndex = "10000000";
      }

      // Setup nested modal for creating related entities
      const nestedModal = document.getElementById(`${resource}-nested-modal`);
      const nestedForm = document.getElementById(`${resource}-nested-form`);
      const nestedTitle = document.getElementById(`${resource}-nested-title`);
      const nestedError = document.getElementById(`${resource}-nested-error`);
      const nestedCancelBtn = document.getElementById(`${resource}-nested-cancel`);
      const nestedSaveBtn = document.getElementById(`${resource}-nested-save`);
      let currentNestedField = null;
      let currentNestedResource = null;

      if (overlay && nestedModal && nestedModal.parentElement !== overlay) {
        overlay.appendChild(nestedModal);
      }

      const showNestedModal = async (fieldName) => {
        currentNestedField = fieldName;
        currentNestedResource = getRelatedResourceName(fieldName);
        
        const config = resourceConfigs[currentNestedResource];
        if (!config) {
          alert(`No se puede crear ${currentNestedResource} - configuración no encontrada`);
          return;
        }

        nestedTitle.textContent = `Crear ${config.title || currentNestedResource}`;
        nestedError.textContent = "";
        
        // Show modal with loading state
        nestedForm.innerHTML = '<p style="text-align: center; padding: 20px;">⏳ Cargando...</p>';
        if (overlay) overlay.style.display = "flex";
        nestedModal.style.display = "block";
        
        // Load related data for nested FK fields
        const nestedRelatedData = {};
        const nestedFkFields = config.fields.filter(f => f.name.startsWith("id_") && !f.readOnly);
        
        for (const fkField of nestedFkFields) {
          const relatedResourceName = getRelatedResourceName(fkField.name);
          try {
            const res = await listResource(relatedResourceName, { page: 1, per_page: 1000 });
            nestedRelatedData[fkField.name] = res.data.items || res.data || [];
          } catch (err) {
            console.error(`Error loading ${relatedResourceName}:`, err);
            nestedRelatedData[fkField.name] = [];
          }
        }
        
        // Render form fields for the nested entity
        nestedForm.innerHTML = config.fields
          .filter(f => !f.readOnly && f.name !== "id" && !f.name.startsWith("fecha_"))
          .map(f => {
            const type = f.type || "text";
            // Determine if field is required based on common patterns
            const isRequired = f.name === "nombre" || f.name === "placa" || f.name === "cedula" || 
                             f.name === "codigo" || f.name === "nombre_usuario" ||
                             (f.name.startsWith("id_") && currentNestedResource === "galpones" && f.name === "id_granja");
            
            if (f.type === "checkbox") {
              return `
                <label style="display: block; margin-bottom: 10px;">
                  <input type="checkbox" name="${f.name}" />
                  ${f.label}
                </label>
              `;
            }
            // For nested FKs, render as dropdown with data
            if (f.name.startsWith("id_")) {
              const relatedItems = nestedRelatedData[f.name] || [];
              const options = relatedItems.map(item => 
                `<option value="${item.id}">${getDisplayLabel(item)}</option>`
              ).join("");
              
              return `
                <label style="display: block; margin-bottom: 10px;">
                  ${f.label} ${isRequired ? '<span style="color: red;">*</span>' : ''}
                  <select 
                    name="${f.name}" 
                    style="width: 100%; padding: 6px; box-sizing: border-box;"
                    ${isRequired ? 'required' : ''}
                  >
                    <option value="">-- Seleccione --</option>
                    ${options}
                  </select>
                  ${!isRequired ? '<small style="color: #666;">Opcional</small>' : ''}
                </label>
              `;
            }
            return `
              <label style="display: block; margin-bottom: 10px;">
                ${f.label} ${isRequired ? '<span style="color: red;">*</span>' : ''}
                <input 
                  type="${type}" 
                  name="${f.name}" 
                  style="width: 100%; padding: 6px; box-sizing: border-box;"
                  ${isRequired ? 'required' : ''}
                >
              </label>
            `;
          })
          .join("");
      };

      const hideNestedModal = () => {
        nestedModal.style.display = "none";
        nestedForm.innerHTML = "";
        currentNestedField = null;
        currentNestedResource = null;
      };

      // Handle "Create New" button clicks
      form.addEventListener("click", (e) => {
        const btn = e.target.closest(".create-related-btn");
        if (!btn) return;
        e.preventDefault();
        const fieldName = btn.dataset.field;
        showNestedModal(fieldName);
      });

      // Handle nested form save
      nestedSaveBtn.addEventListener("click", async () => {
        nestedError.textContent = "";
        
        // Validate required fields
        const requiredInputs = nestedForm.querySelectorAll('[required]');
        let hasErrors = false;
        requiredInputs.forEach(input => {
          if (!input.value || input.value.trim() === "") {
            hasErrors = true;
            input.style.borderColor = "red";
          } else {
            input.style.borderColor = "";
          }
        });
        
        if (hasErrors) {
          nestedError.textContent = "Por favor complete todos los campos requeridos (*)";
          return;
        }
        
        const formData = new FormData(nestedForm);
        const data = {};
        const config = resourceConfigs[currentNestedResource];
        
        for (const [key, value] of formData.entries()) {
          const fieldConfig = config.fields.find(f => f.name === key);
          const inputElement = nestedForm.querySelector(`[name="${key}"]`);
          
          if (inputElement?.type === "checkbox") {
            data[key] = inputElement.checked;
          } else if (key.startsWith("id_")) {
            // Parse as integer for ID fields
            const numValue = parseInt(value, 10);
            data[key] = !isNaN(numValue) ? numValue : undefined;
          } else if (fieldConfig?.type === "number") {
            // Parse as float for other numeric fields
            const numValue = parseFloat(value);
            data[key] = !isNaN(numValue) ? numValue : undefined;
          } else {
            data[key] = value;
          }
        }

        // Remove undefined values and empty strings
        Object.keys(data).forEach(key => {
          if (data[key] === undefined || data[key] === "") {
            delete data[key];
          }
        });

        nestedSaveBtn.disabled = true;
        nestedSaveBtn.textContent = "Guardando...";

        try {
          const res = await createResource(currentNestedResource, data);
          const newItem = res.data;
          
          // Add to related data
          if (!relatedData[currentNestedField]) {
            relatedData[currentNestedField] = [];
          }
          relatedData[currentNestedField].push(newItem);

          // Update the datalist
          const dataList = document.getElementById(`list-${currentNestedField}`);
          if (dataList) {
            const opt = document.createElement("option");
            opt.value = getDisplayLabel(newItem);
            dataList.appendChild(opt);
          }

          // Set the newly created item as selected
          const searchInput = document.getElementById(`search-${currentNestedField}`);
          const hiddenInput = form.querySelector(`[name="${currentNestedField}"]`);
          if (searchInput && hiddenInput) {
            searchInput.value = getDisplayLabel(newItem);
            hiddenInput.value = newItem.id;
          }

          alert(`${nestedTitle.textContent} creado exitosamente`);
          hideNestedModal();
          
        } catch (err) {
          nestedError.textContent = err?.response?.data?.error || err.message || "Error al crear";
        } finally {
          nestedSaveBtn.disabled = false;
          nestedSaveBtn.textContent = "Guardar";
        }
      });

      nestedCancelBtn.addEventListener("click", hideNestedModal);

      const openItem = (id, mode = "view") => {
        const item = currentItems.find((i) => i.id == id);
        if (!item) return;
        editingId = item.id;
        setFormData(item);

        if (mode === "view" || !canEdit) {
          readOnly = true;
        } else {
          readOnly = false;
        }

        updateFormState();
        showModal();
      };

      table.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;

        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === "view") {
          openItem(id, "view");
          return;
        }
        if (action === "edit") {
          openItem(id, "edit");
          return;
        }
        if (action === "delete") {
          // ...existing delete logic...
          return;
        }
      });

      tbody.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        const row = e.target.closest("tr");
        if (!row) return;
        const id = row.dataset.id;
        openItem(id, canEdit ? "edit" : "view");
      });

      const showModal = () => {
        if (overlay) overlay.style.display = "flex";
        if (modal) modal.style.display = "block";
      };

      const hideModal = () => {
        if (overlay) overlay.style.display = "none";
        if (modal) modal.style.display = "none";
      };

      if (overlay) {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) hideModal();
        });
      }

      const updateFormState = () => {
        const inputs = form.querySelectorAll("input, select, textarea");

        if (!editingId) {
          if (canCreate) {
            submitBtn.textContent = "Guardar Entrada";
            inputs.forEach((i) => {
              const fieldConfig = fields.find((f) => f.name === i.name);
              if (fieldConfig?.readOnly) i.disabled = true;
              else i.disabled = false;
            });

            // Productos: ocultar campo código en creación
            if (resource === "productos") {
              const codigoInput = form.querySelector('input[name="codigo"]');
              const codigoLabel = codigoInput?.closest("label");
              if (codigoLabel) codigoLabel.style.display = "none";
            }

            weighButtons.forEach((btn) => (btn.disabled = false));
            submitBtn.style.display = "inline-block";
            cancelBtn.textContent = "Cancelar";
          } else {
            inputs.forEach((i) => (i.disabled = true));
            weighButtons.forEach((btn) => (btn.disabled = true));
            submitBtn.style.display = "none";
          }
        } else {
          // 2. MODO EDICIÓN / VISUALIZACIÓN
          const item = currentItems.find((i) => i.id == editingId);
          const isTicketInProcess =
            resource === "tickets_pesaje" && item?.estado === "En Proceso";

          if (isTicketInProcess) {
            submitBtn.textContent = "Finalizar Salida";
            submitBtn.style.display = "inline-block";
            cancelBtn.textContent = "Cancelar";

            inputs.forEach((i) => (i.disabled = true));

            weighButtons.forEach((btn) => {
              const inputName = btn.dataset.target;
              const val = item[inputName];
              if (!val || val === 0) btn.disabled = false;
              else btn.disabled = true;
            });
          } else if (canEdit) {
            submitBtn.textContent = "Actualizar";
            inputs.forEach((i) => (i.disabled = false));
            submitBtn.style.display = "inline-block";
            weighButtons.forEach((btn) => (btn.disabled = false));
          } else {
            inputs.forEach((i) => (i.disabled = true));
            weighButtons.forEach((btn) => (btn.disabled = true));
            submitBtn.style.display = "none";
            cancelBtn.textContent = "Cerrar Detalle";
          }

          // Productos: mostrar campo código en edición y solo lectura
          if (resource === "productos") {
            const codigoInput = form.querySelector('input[name="codigo"]');
            const codigoLabel = codigoInput?.closest("label");
            if (codigoLabel) codigoLabel.style.display = "";
            if (codigoInput) codigoInput.disabled = true;
          }
        }
      };

      const setError = (msg) => (errorEl.textContent = msg || "");

      // Lógica de captura de peso
      weighButtons.forEach((btn) => {
        btn.addEventListener("click", async () => {
          const targetName = btn.dataset.target;
          const input = form.querySelector(`input[name="${targetName}"]`);

          btn.disabled = true;
          btn.textContent = "⏳ Leyendo...";

          try {
            const res = await getWeighFromTruckScale();
            console.log("Respuesta Balanza:", res);

            // CORRECCIÓN: Lógica robusta para extraer el peso escalar
            let weight = null;

            if (res.data && typeof res.data === "object") {
              // Si devuelve objeto, buscamos propiedades comunes en orden de probabilidad
              if (res.data.weight !== undefined) weight = res.data.weight;
              else if (res.data.data !== undefined)
                weight = res.data.data; // <--- AÑADIDO: Tu API devuelve { data: "..." }
              else if (res.data.value !== undefined) weight = res.data.value;
              else if (res.data.reading !== undefined)
                weight = res.data.reading;
              else {
                // Si es un objeto pero no tiene claves conocidas
                throw new Error(
                  "La balanza devolvió un objeto sin propiedad de peso conocida (weight, data, value).",
                );
              }
            } else {
              // Si devuelve directamente el numero/string
              weight = res.data;
            }

            // Validación final para asegurar que no metemos un Objeto al input
            if (weight === null || typeof weight === "object") {
              throw new Error("Formato de peso inválido recibido.");
            }

            console.log("Peso extraído:", weight);
            if (input) {
              input.value = weight;
              // Disparar evento input para que se detecten cambios
              input.dispatchEvent(new Event("input"));
            }
          } catch (err) {
            console.error(err);
            setError(
              "Error al leer balanza: " + (err.message || "Desconocido"),
            );
          } finally {
            btn.disabled = false;
            btn.textContent = "⚖️ Capturar";
            // En modo proceso, volver a deshabilitar si ya tiene valor
            if (editingId && resource === "tickets_pesaje") {
              // updateFormState verifica si tiene valor, si ya tiene, lo bloquea en la sig iteración
            }
          }
        });
      });

      const applyCurrentUser = () => {
        if (!currentUser || editingId) return; // Solo aplicar en creación

        const userField = fields.find((f) => f.name === "id_usuario");
        if (userField) {
          const hiddenInput = form.querySelector('input[name="id_usuario"]');
          const searchInput = document.getElementById("search-id_usuario");

          if (hiddenInput) hiddenInput.value = currentUser.id;
          if (searchInput) searchInput.value = getDisplayLabel(currentUser);
        }
      };

      const renderRows = (items) => {
        tbody.innerHTML = "";
        items.forEach((item) => {
          const tr = document.createElement("tr");
          tr.dataset.id = item.id;

          const dataCells = fields
            .filter(
              (f) =>
                f.type !== "password" &&
                f.name !== "fecha_registro" &&
                f.label !== "Fecha",
            )
            .map((f) => {
              let val = item[f.name] ?? "";
              if (f.name.startsWith("id_") && relatedData[f.name]) {
                const relItem = relatedData[f.name].find((r) => r.id == val);
                if (relItem) val = getDisplayLabel(relItem) || val;
              }

              if (f.name.startsWith("fecha_") && val) {
                val = new Date(val).toLocaleString();
              }
              return `<td>${val}</td>`;
            })
            .join("");
          let actionsCell = "";
          if (readOnly) {
            actionsCell = `
                <td>
                  <button data-action="view" data-id="${item.id}">Ver Detalle</button>
                </td>
              `;
          } else {
            actionsCell = `
                <td>
                  <button data-action="view" data-id="${item.id}">Ver Detalle</button>
                  <button data-action="edit" data-id="${item.id}">Editar</button>
                  <button data-action="delete" data-id="${item.id}">Eliminar</button>
                </td>
              `;
          }

          tr.innerHTML = dataCells + actionsCell;
          tbody.appendChild(tr);
        });
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
                opt.value = getDisplayLabel(item);
                dataList.appendChild(opt);
              });
            }
          } catch (err) {
            console.error(`Error loading related resource ${resName}`, err);
          }
        }
        // Refrescar tabla si ya se cargó para mostrar nombres en lugar de IDs
        if (currentItems.length > 0) {
          renderRows(currentItems);
        }
      };

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
        if (input.id && input.id.startsWith("search-id_")) {
          const fieldName = input.id.replace("search-", "");
          const val = input.value;
          const hiddenInput = form.querySelector(`input[name="${fieldName}"]`);

          if (!val) {
            hiddenInput.value = "";
            return;
          }

          const list = relatedData[fieldName] || [];
          const match = list.find((item) => getDisplayLabel(item) === val);

          if (match) {
            hiddenInput.value = match.id;
          } else {
            hiddenInput.value = "";
          }
        }
      });

      const setProductCodePreview = async () => {
        if (resource !== "productos") return;
        if (editingId) return;

        const codigoInput = form.querySelector('input[name="codigo"]');
        if (!codigoInput) return;

        try {
          const res = await listResource("productos", {
            page: 1,
            per_page: 1,
            sort: "id",
            order: "desc",
          });
          const items = res.data.items || res.data || [];
          const lastId = items[0]?.id || 0;
          const nextId = lastId + 1;
          const code = `PRD-${String(nextId).padStart(6, "0")}`;

          codigoInput.value = code;
          codigoInput.disabled = true;
        } catch {
          codigoInput.value = "PRD-000000";
          codigoInput.disabled = true;
        }
      };

      const getFormData = () => {
        const data = {};
        fields.forEach((f) => {
          if (f.name === "id") return;
          
          // Handle nested fields (e.g., "persona.nombre" -> data.persona = {nombre: value})
          if (f.name.includes(".")) {
            const parts = f.name.split(".");
            const el = form.querySelector(`[name="${f.name}"]`);
            if (!el) return;
            
            let current = data;
            for (let i = 0; i < parts.length - 1; i++) {
              if (!current[parts[i]]) current[parts[i]] = {};
              current = current[parts[i]];
            }
            
            const lastPart = parts[parts.length - 1];
            if (f.type === "checkbox") {
              current[lastPart] = !!el.checked;
            } else {
              if ((lastPart.startsWith("id_") || f.type === "number") && el.value !== "") {
                current[lastPart] = parseFloat(el.value);
              } else {
                current[lastPart] = el.value;
              }
            }
            return;
          }
          
          const el = form.querySelector(`[name="${f.name}"]`);
          if (!el) return;

          // Productos: NO enviar codigo en creación
          if (resource === "productos" && f.name === "codigo" && !editingId) {
            return;
          }

          if (f.type === "checkbox") {
            data[f.name] = !!el.checked;
          } else {
            if (
              (f.name.startsWith("id_") || f.type === "number") &&
              el.value !== ""
            ) {
              data[f.name] = parseFloat(el.value);
            } else {
              data[f.name] = el.value;
            }
          }
        });
        return data;
      };

      const setFormData = (item) => {
        fields.forEach((f) => {
          // Handle nested fields (e.g., "persona.nombre")
          if (f.name.includes(".")) {
            const el = form.querySelector(`[name="${f.name}"]`);
            if (!el) return;
            
            // Navigate through the nested object
            const parts = f.name.split(".");
            let val = item;
            for (const part of parts) {
              val = val?.[part];
              if (val === undefined) break;
            }
            
            if (f.type === "password") {
              el.value = "";
            } else if (f.type === "checkbox") {
              el.checked = !!val;
            } else {
              el.value = val ?? (f.defaultValue || "");
            }
            return;
          }
          
          const el = form.querySelector(`[name="${f.name}"]`);

          if (f.name.startsWith("id_")) {
            const searchInput = document.getElementById(`search-${f.name}`);
            const hiddenInput = form.querySelector(`[name="${f.name}"]`);

            // CORRECCIÓN: Manejo de objetos nesteadas en FKs
            let idVal = item[f.name];
            if (idVal && typeof idVal === "object") {
              idVal = idVal.id; // Extraer ID si viene el objeto completo
            }

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

          let val = item[f.name];

          // Productos: mostrar código real
          if (resource === "productos" && f.name === "codigo") {
            if (el) {
              el.value =
                item.codigo || `PRD-${String(item.id).padStart(6, "0")}`;
            }
            return;
          }

          // CORRECCIÓN FINAL: Evitar asignar Objetos a inputs normales (evita el crash)
          if (val && typeof val === "object") {
            // Si el campo no es ID pero viene un objeto, lo limpiamos o lo convertimos a string seguro
            console.warn(
              `Campo ${f.name} recibió un objeto, se limpiará para evitar error.`,
            );
            val = "";
          }

          if (f.type === "checkbox") el.checked = !!val;
          else el.value = val ?? "";
        });
      };

      const clearForm = () => {
        editingId = null;
        form.reset();
        if (canCreate) applyCurrentUser();
        updateFormState();
        hideModal();
      };

      const load = async () => {
        setError("");
        try {
          // Usar sort: id desc para ver lo último primero
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

      // Override submit para validación de pesos
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        setError("");

        // Validación específica tickets
        if (resource === "tickets_pesaje") {
          const formData = getFormData();
          if (!formData.peso_bruto && !formData.peso_tara) {
            setError("Debe capturar al menos un peso.");
            return;
          }
        }

        const payload = getFormData();

        // --- CAMBIO: Estado de carga (Deshabilitar botón) ---
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Procesando...";
        // ----------------------------------------------------

        try {
          if (editingId) {
            // Permitir update si es ticket en proceso, aunque canEdit sea false globalmente
            const item = currentItems.find((i) => i.id == editingId);
            if (
              (!canEdit &&
                resource === "tickets_pesaje" &&
                item.estado === "En Proceso") ||
              canEdit
            ) {
              await updateResource(resource, editingId, payload);
            } else {
              throw new Error("No tienes permiso para editar.");
            }
          } else {
            if (!canCreate) throw new Error("No tienes permiso para crear.");
            await createResource(resource, payload);
          }

          // Si todo sale bien, clearForm reiniciará el estado del formulario y botones
          clearForm();
          await load();
        } catch (err) {
          setError(
            err?.response?.data?.error || err.message || "Error al guardar",
          );

          // --- CAMBIO: Restaurar botón SOLAMENTE si hubo error ---
          // Si hubo error, el usuario necesita el botón activo para corregir y reintentar
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          // -------------------------------------------------------
        }
      });

      cancelBtn.addEventListener("click", clearForm);
      searchInput.addEventListener("input", (e) => {
        /* ... */
      });

      const newBtn = document.getElementById(`${resource}-new-btn`);
      newBtn.className = "create-button";

      if (newBtn) {
        newBtn.style.display = canCreate ? "inline-block" : "none";
        newBtn.addEventListener("click", () => {
          editingId = null;
          form.reset();
          applyCurrentUser();
          updateFormState();
          setProductCodePreview();
          showModal();
        });
      }

      // Init
      updateFormState();
      load();
      loadRelatedResources();
      if (canCreate) loadUserInfo();
    },
  };
};

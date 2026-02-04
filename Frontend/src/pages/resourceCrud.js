import {
  listResource,
  createResource,
  updateResource,
  deleteResource,
  getUserInfo,
  getWeighFromTruckScale,
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
    rol: "roles",
  };
  return map[singular] || singular + "s";
};

// Helper to determine what text to show in the dropdown/table
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

export const createCrudPage = ({ title, resource, fields, pageSize = 50 }) => {
  const formId = `${resource}-form`;
  const tableId = `${resource}-table`;
  const errorId = `${resource}-error`;
  const cancelId = `${resource}-cancel`;
  const searchId = `${resource}-search`;
  const modalId = `${resource}-modal`;

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
      return `<label><input type="checkbox" name="${f.name}" ${hidden} /> ${f.label}</label>`;
    }

    // Renderizado estándar con posible botón addon
    return `
      <label>
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

      <div id="${modalId}" style="display:none; background: white; opacity: 1 !important; width: 70%; margin: 5% auto; padding: 20px; border-radius: 8px; max-height: 90vh; overflow-y: auto;">
        <form id="${formId}">
          ${fields.map(renderField).join("")}
          <button type="submit">Guardar</button>
          <button type="button" id="${cancelId}">Cancelar</button>
        </form>
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
              .filter((f) => f.type !== "password")
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
            .filter((f) => f.type !== "password")
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

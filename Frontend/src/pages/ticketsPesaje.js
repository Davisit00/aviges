import {
  listResource,
  createResource,
  getWeighFromTruckScale,
  getUserInfo,
  api,
} from "../api.js";
import { resourceConfigs } from "./resourceConfigs.js";

// Helper visualización labels (Actualizado para manejar objetos anidados como Combined Choferes)
const getDisplayLabel = (item) => {
  if (!item) return "";

  // Vehiculo
  if (item.placa)
    return item.placa + (item.descripcion ? ` - ${item.descripcion}` : "");

  // Chofer (Manejo de respuesta /combined/choferes que incluye 'persona')
  if (item.persona) {
    return `${item.persona.cedula} - ${item.persona.nombre} ${item.persona.apellido}`;
  }
  // Chofer (Fallback si viene plano o es un objeto Persona directo)
  if (item.cedula)
    return `${item.cedula} - ${item.nombre || ""} ${item.apellido || ""}`;

  // Producto
  if (item.codigo && item.nombre) return `${item.codigo} - ${item.nombre}`;

  // Ubicacion
  if (item.nombre && item.tipo) return `${item.tipo} - ${item.nombre}`; // Ej: Granja - La Rosita

  // Generico
  if (item.nombre) return item.nombre;
  return item.id;
};

export const TicketsPesajeInterface = {
  template: `
    <div class="tickets-container">
      <div class="header-actions" style="display: flex; gap: 20px; margin-bottom: 20px;">
        <button id="btn-entrada" style="padding: 15px 30px; font-size: 1.2em; background-color: #4CAF50; color: white; cursor: pointer; border:none; border-radius:4px;">
           🚛 Registrar ENTRADA (Materia Prima)
        </button>
        <button id="btn-salida" style="padding: 15px 30px; font-size: 1.2em; background-color: #2196F3; color: white; cursor: pointer; border:none; border-radius:4px;">
           🚚 Registrar SALIDA (Despacho)
        </button>
      </div>

      <div id="error-msg" style="color: red; margin-bottom: 10px; font-weight: bold;"></div>

      <!-- SECCIÓN DE LISTADO DE ESPERA -->
      <div id="wait-list-section" style="background:white; padding:20px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
          <h3>⏳ Vehículos en Planta (En Espera de Segundo Pesaje)</h3>
          <p><i>Haga doble click sobre un vehículo para completar su pesaje y finalizar el ticket.</i></p>
          <table id="pending-tickets-table" style="width: 100%; margin-top: 10px; border-collapse: collapse;">
            <thead>
                <tr style="background:#f8f9fa; border-bottom:2px solid #dee2e6;">
                    <th style="padding:12px; text-align:left;">Ticket #</th>
                    <th style="padding:12px; text-align:left;">Tipo</th>
                    <th style="padding:12px; text-align:left;">Placa</th>
                    <th style="padding:12px; text-align:left;">Chofer</th>
                    <th style="padding:12px; text-align:left;">Ruta</th>
                    <th style="padding:12px; text-align:left;">Producto</th>
                    <th style="padding:12px; text-align:left;">1er Peso</th>
                    <th style="padding:12px; text-align:left;">Fecha</th>
                    <th style="padding:12px; text-align:left;">Estado</th>
                </tr>
            </thead>
            <tbody></tbody>
          </table>
      </div>
    </div>

    <!-- MODAL INTEGRADO (OVERLAY + CONTENIDO) -->
    <div id="local-modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
        
        <div id="ticket-modal" style="background: white; width: 70%; max-width: 900px; padding: 25px; border-radius: 8px; max-height: 90vh; overflow-y: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 id="modal-title" style="margin:0;">Nuevo Ticket</h2>
                <button id="btn-close-x" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
            </div>
            
            <form id="ticket-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                
                <input type="hidden" name="id">
                <input type="hidden" name="id_usuario">
                <input type="hidden" name="estado" value="En Proceso">

                <!-- 1. INFO PROCESO -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; grid-column: span 2; background:#f5f5f5; padding:15px; border-radius:5px;">
                    <div>
                        <label style="display:block; font-weight:bold; margin-bottom:5px;">Tipo de Proceso</label>
                        <input type="text" name="tipo_proceso" readonly style="width:100%; padding:8px; border:1px solid #ccc;">
                    </div>
                     <div>
                        <label style="display:block; font-weight:bold; margin-bottom:5px;">Nro Ticket (Auto)</label>
                        <input type="text" name="nro_ticket" readonly style="width:100%; padding:8px; border:1px solid #ccc; background:#e9ecef;">
                    </div>
                </div>

                <!-- 2. TRANSPORTE -->
                <div>
                    <label style="display:block; margin-bottom:5px;">Vehículo</label>
                    <div style="display: flex; gap: 8px;">
                        <div style="flex: 1;">
                            <input list="list-vehiculos" id="search-id_vehiculo" placeholder="Buscar placa..." autocomplete="off" style="width:100%; padding:8px;">
                            <datalist id="list-vehiculos"></datalist>
                            <input type="hidden" name="id_vehiculo">
                        </div>
                        <button type="button" class="create-related-btn" data-resource="vehiculos" data-target="id_vehiculo"
                         style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;"
                         title="Nuevo Vehículo">+</button>
                    </div>
                </div>
                 <div>
                    <label style="display:block; margin-bottom:5px;">Chofer</label>
                     <div style="display: flex; gap: 8px;">
                        <div style="flex: 1;">
                            <input list="list-choferes" id="search-id_chofer" placeholder="Buscar chofer..." autocomplete="off" style="width:100%; padding:8px;">
                            <datalist id="list-choferes"></datalist>
                            <input type="hidden" name="id_chofer">
                        </div>
                        <button type="button" class="create-related-btn" data-resource="choferes" data-target="id_chofer"
                         style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;"
                         title="Nuevo Chofer">+</button>
                    </div>
                </div>

                <!-- 3. RUTA -->
                <div>
                    <label style="display:block; margin-bottom:5px;">Origen</label>
                    <div style="display: flex; gap: 8px;">
                         <select name="id_origen" id="select-origen" style="width:100%; padding:8px; flex:1"></select>
                         <button type="button" class="create-related-btn" data-resource="ubicaciones" data-target="id_origen"
                         style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;"
                         title="Nueva Ubicación">+</button>
                    </div>
                </div>
                <div>
                    <label style="display:block; margin-bottom:5px;">Destino</label>
                     <div style="display: flex; gap: 8px;">
                         <select name="id_destino" id="select-destino" style="width:100%; padding:8px; flex:1"></select>
                         <button type="button" class="create-related-btn" data-resource="ubicaciones" data-target="id_destino"
                         style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;"
                         title="Nueva Ubicación">+</button>
                    </div>
                </div>

                <!-- 4. PRODUCTO -->
                <div style="grid-column: span 2;">
                    <label style="display:block; margin-bottom:5px;">Producto</label>
                    <div style="display: flex; gap: 8px;">
                        <div style="flex: 1;">
                            <input list="list-productos" id="search-id_producto" placeholder="Buscar producto..." style="width: 100%; padding:8px;" autocomplete="off">
                            <datalist id="list-productos"></datalist>
                            <input type="hidden" name="id_producto">
                        </div>
                        <button type="button" class="create-related-btn" data-resource="productos" data-target="id_producto"
                         style="padding: 0 12px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight:bold;"
                         title="Nuevo Producto">+</button>
                    </div>
                </div>

                <!-- 5. PESAJE -->
                <div style="background: #e3f2fd; padding: 15px; grid-column: span 2; border: 1px solid #90caf9; border-radius:5px;">
                    <h3 style="margin-top:0; color:#1565c0;">⚖️ Balanza</h3>
                    
                    <div style="display: flex; gap: 20px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <label style="font-weight: bold; display:block;">Peso BRUTO (Full)</label>
                            <input type="number" name="peso_bruto" id="input-bruto" readonly style="width:100%; padding:8px; margin-bottom:5px;">
                            <button type="button" id="btn-cap-bruto" class="capture-btn" style="width:100%; padding:8px; cursor:pointer;">⚖️ Capturar</button>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-weight: bold; display:block;">Peso TARA (Vacío)</label>
                            <input type="number" name="peso_tara" id="input-tara" readonly style="width:100%; padding:8px; margin-bottom:5px;">
                            <button type="button" id="btn-cap-tara" class="capture-btn" style="width:100%; padding:8px; cursor:pointer;">⚖️ Capturar</button>
                        </div>
                         <div style="flex: 1;">
                            <label style="font-weight: bold; display:block;">Peso NETO</label>
                            <input type="number" name="peso_neto" id="input-neto" readonly style="width:100%; padding:8px; background: #fff3cd; font-weight: bold;">
                        </div>
                    </div>
                </div>

                <!-- 6. EXTRAS -->
                <div>
                     <label style="display:block; margin-bottom:5px;">Cantidad Cestas</label>
                     <input type="number" name="cantidad_cestas" style="width:100%; padding:8px;">
                </div>
                <div>
                     <label style="display:block; margin-bottom:5px;">Peso Avisado</label>
                     <input type="number" name="peso_avisado" style="width:100%; padding:8px;">
                </div>

                <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px; border-top:1px solid #eee; padding-top:20px;">
                    <button type="button" id="btn-cancel" style="padding: 10px 20px; background: #6c757d; color: white; border: none; cursor: pointer; border-radius:4px;">Cancelar</button>
                    <button type="submit" id="btn-save" style="padding: 10px 30px; background: #28a745; color: white; border: none; cursor: pointer; font-weight: bold; border-radius:4px;">GUARDAR TICKET</button>
                </div>

            </form>
        </div>
    </div>
  `,

  setup(permissions = {}) {
    // --- ESTADO ---
    let listData = {
      vehiculos: [],
      choferes: [],
      productos: [],
      ubicaciones: [],
      asignaciones: [], // NECESARIO: Relación Ticket -> [Asignacion] -> Chofer/Vehiculo
    };
    let pendingTickets = [];
    let currentUser = null;
    let currentMode = "create";

    // --- DOM Elements ---
    const form = document.getElementById("ticket-form");
    const overlay = document.getElementById("local-modal-overlay");
    const tableBody = document.querySelector("#pending-tickets-table tbody");
    const errorMsg = document.getElementById("error-msg");
    const inputBruto = document.getElementById("input-bruto");
    const inputTara = document.getElementById("input-tara");
    const inputNeto = document.getElementById("input-neto");
    const btnBruto = document.getElementById("btn-cap-bruto");
    const btnTara = document.getElementById("btn-cap-tara");

    // --- HELPERS ---
    const calculateNeto = () => {
      const b = parseFloat(inputBruto.value) || 0;
      const t = parseFloat(inputTara.value) || 0;
      if (b > 0 && t > 0) inputNeto.value = Math.abs(b - t).toFixed(2);
      else inputNeto.value = "";
    };

    const toggleModal = (show) => {
      overlay.style.display = show ? "flex" : "none";
      if (!show) {
        form.reset();
        errorMsg.textContent = "";
      }
    };

    // --- QUICK CREATE (Relacionados) ---
    const openQuickCreate = (resourceName, targetField) => {
      const config = resourceConfigs[resourceName];
      if (!config) {
        alert("Error conf: " + resourceName);
        return;
      }

      const div = document.createElement("div");
      div.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; display:flex; justify-content:center; align-items:center;`;

      const formHtml = config.fields
        .map((f) => {
          if (f.readOnly || f.hidden || f.name === "id") return "";
          const req = f.required ? "required" : "";

          // Simple Select handling for quick create
          if (f.type === "select") {
            return `<label style="display:block; margin-bottom:10px;">${f.label} 
                <select name="${f.name}" style="width:100%;" ${req}><option value="">--</option><option>A</option><option>B</option></select></label>`;
          }
          if (f.name.startsWith("id_")) return ""; // Simplificación
          return `<label style="display:block; margin-bottom:10px;">${f.label} <input type="${f.type || "text"}" name="${f.name}" style="width:100%;" ${req}></label>`;
        })
        .join("");

      div.innerHTML = `
        <div style="background:white; padding:20px; border-radius:8px; width:400px; max-height:90vh; overflow:auto;">
            <h3>Nuevo ${config.title}</h3>
            <form id="quick-form">
                ${formHtml}
                <div style="margin-top:20px; text-align:right;">
                    <button type="button" id="quick-cancel" style="margin-right:10px;">Cancelar</button>
                    <button type="submit">Guardar</button>
                </div>
            </form>
        </div>
      `;
      document.body.appendChild(div);

      div.querySelector("#quick-cancel").onclick = () =>
        document.body.removeChild(div);

      div.querySelector("#quick-form").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        // Conversiones
        for (let k in data) {
          if (e.target.querySelector(`[name="${k}"]`).type === "number")
            data[k] = parseFloat(data[k]);
        }
        try {
          const res = await createResource(resourceName, data);
          const newItem = res.data;

          if (listData[resourceName]) {
            listData[resourceName].push(newItem);
            // Update Datalist/Select
            const mapLists = {
              vehiculos: "list-vehiculos",
              choferes: "list-choferes",
              productos: "list-productos",
            };
            if (mapLists[resourceName]) {
              const dl = document.getElementById(mapLists[resourceName]);
              const opt = document.createElement("option");
              opt.value = getDisplayLabel(newItem);
              opt.dataset.id = newItem.id;
              dl.appendChild(opt);

              // Auto-fill form
              const searchIn = document.getElementById(`search-${targetField}`);
              if (searchIn) searchIn.value = getDisplayLabel(newItem);
              const hiddenIn = form.querySelector(`[name="${targetField}"]`);
              if (hiddenIn) hiddenIn.value = newItem.id;
            }
            if (resourceName === "ubicaciones") {
              ["select-origen", "select-destino"].forEach((sid) => {
                const sel = document.getElementById(sid);
                const opt = document.createElement("option");
                opt.value = newItem.id;
                opt.textContent = getDisplayLabel(newItem);
                sel.appendChild(opt);
              });
            }
          }
          document.body.removeChild(div);
        } catch (err) {
          alert("Error: " + (err.response?.data?.error || err.message));
        }
      };
    };

    // --- DATA LOADING ---
    const loadLists = async () => {
      try {
        const [vRes, dRes, pRes, uRes, lRes, aRes] = await Promise.all([
          listResource("vehiculos", { per_page: 1000 }),
          listResource("combined/choferes", { per_page: 1000 }), // IMPORTANTE: Combined para tener nombres
          listResource("productos", { per_page: 1000 }),
          getUserInfo(),
          listResource("ubicaciones", { per_page: 1000 }),
          listResource("asignaciones", { per_page: 1000 }), // NECESARIO: Para resolver FKs del ticket
        ]);

        listData.vehiculos = vRes.data.items || vRes.data;
        listData.choferes = dRes.data.items || dRes.data;
        listData.productos = pRes.data.items || pRes.data;
        currentUser = uRes.data;
        listData.ubicaciones = lRes.data.items || lRes.data;
        listData.asignaciones = aRes.data.items || aRes.data;

        initDatalists();
        initSelects();
      } catch (error) {
        console.error(error);
        errorMsg.textContent = "Error cargando datos maestros.";
      }
    };

    const initDatalists = () => {
      const populate = (id, items) => {
        const dl = document.getElementById(id);
        dl.innerHTML = "";
        items.forEach((item) => {
          const opt = document.createElement("option");
          opt.value = getDisplayLabel(item);
          opt.dataset.id = item.id;
          dl.appendChild(opt);
        });
      };
      populate("list-vehiculos", listData.vehiculos);
      populate("list-choferes", listData.choferes);
      populate("list-productos", listData.productos);
    };

    const initSelects = () => {
      const populateSel = (id) => {
        const sel = document.getElementById(id);
        const oldVal = sel.value;
        sel.innerHTML = '<option value="">-- Seleccionar --</option>';
        listData.ubicaciones.forEach((loc) => {
          const opt = document.createElement("option");
          opt.value = loc.id;
          opt.textContent = getDisplayLabel(loc);
          sel.appendChild(opt);
        });
        if (oldVal) sel.value = oldVal;
      };
      populateSel("select-origen");
      populateSel("select-destino");
    };

    const loadPendingTickets = async () => {
      try {
        const res = await listResource("tickets_pesaje", {
          estado: "En Proceso",
          sort: "id",
          order: "desc",
        });
        pendingTickets = (res.data.items || res.data || []).filter(
          (t) => t.estado === "En Proceso",
        );
        renderTable();
      } catch (error) {
        console.error(error);
      }
    };

    const renderTable = () => {
      tableBody.innerHTML = "";
      if (pendingTickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">No hay vehículos en espera.</td></tr>`;
        return;
      }

      pendingTickets.forEach((ticket) => {
        // 1. Resolver Asignacion
        const asignacion = listData.asignaciones.find(
          (a) => a.id == ticket.id_asignaciones,
        );
        let vehiculo = null;
        let chofer = null;

        if (asignacion) {
          // Nota: id_vehiculos es PLURAL en modelo Asignaciones, pero id_chofer es SINGULAR
          vehiculo = listData.vehiculos.find(
            (v) => v.id == asignacion.id_vehiculos,
          );
          chofer = listData.choferes.find((c) => c.id == asignacion.id_chofer);
        }

        const producto = listData.productos.find(
          (p) => p.id == ticket.id_producto,
        );
        const origen = listData.ubicaciones.find(
          (l) => l.id == ticket.id_origen,
        );
        const destino = listData.ubicaciones.find(
          (l) => l.id == ticket.id_destino,
        );
        const peso =
          ticket.peso_bruto > 0
            ? `Bruto: ${ticket.peso_bruto}`
            : `Tara: ${ticket.peso_tara}`;

        const tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = `
            <td style="padding:10px; border-bottom:1px solid #eee">${ticket.nro_ticket || ticket.id}</td>
            <td style="padding:10px; border-bottom:1px solid #eee"><b>${ticket.tipo}</b></td>
            <td style="padding:10px; border-bottom:1px solid #eee">${getDisplayLabel(vehiculo) || "N/A"}</td>
            <td style="padding:10px; border-bottom:1px solid #eee">${getDisplayLabel(chofer) || "N/A"}</td>
            <td style="padding:10px; border-bottom:1px solid #eee"><small>${origen?.nombre || "--"} &rarr; ${destino?.nombre || "--"}</small></td>
            <td style="padding:10px; border-bottom:1px solid #eee">${producto ? producto.nombre : "N/A"}</td>
            <td style="padding:10px; border-bottom:1px solid #eee">${peso}</td>
            <td style="padding:10px; border-bottom:1px solid #eee">${new Date(ticket.created_at).toLocaleString()}</td>
            <td style="padding:10px; border-bottom:1px solid #eee"><span style="background:#fff3cd; padding:2px 5px; border-radius:4px;">${ticket.estado}</span></td>
        `;
        tr.addEventListener("dblclick", () => openCompleteModal(ticket));
        tableBody.appendChild(tr);
      });
    };

    // --- BALANZA ---
    const handleCapture = async (input, btn) => {
      btn.disabled = true;
      btn.textContent = "...";
      try {
        const res = await getWeighFromTruckScale();
        let val = 0;
        if (typeof res.data === "number") val = res.data;
        else if (res.data?.weight) val = res.data.weight;
        else if (res.data?.data) val = parseFloat(res.data.data);
        if (!val) throw new Error("Lectura vacía");
        input.value = val;
        calculateNeto();
      } catch (e) {
        alert("Error: " + (e.message || "Balanza no responde"));
      } finally {
        btn.disabled = false;
        btn.textContent = "⚖️ Capturar";
      }
    };
    btnBruto.addEventListener("click", () =>
      handleCapture(inputBruto, btnBruto),
    );
    btnTara.addEventListener("click", () => handleCapture(inputTara, btnTara));

    // --- SEARCH LISTENERS ---
    const setupSearchListener = (inputId, hiddenName, dataSource) => {
      document.getElementById(inputId).addEventListener("change", (e) => {
        const val = e.target.value;
        const item = dataSource.find((i) => getDisplayLabel(i) === val);
        form.querySelector(`[name="${hiddenName}"]`).value = item
          ? item.id
          : "";
      });
    };

    // --- UI/UX ---
    form.addEventListener("click", (e) => {
      if (e.target.classList.contains("create-related-btn")) {
        const { resource, target } = e.target.dataset;
        openQuickCreate(resource, target);
      }
    });

    const toggleFields = (enabled) => {
      const ids = [
        "search-id_vehiculo",
        "search-id_chofer",
        "search-id_producto",
        "select-origen",
        "select-destino",
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = !enabled;
      });
      form
        .querySelectorAll(".create-related-btn")
        .forEach((b) => (b.disabled = !enabled));
    };

    const openCreateModal = (type) => {
      currentMode = "create";
      toggleModal(true);
      document.getElementById("modal-title").textContent =
        `Nueva ${type.toUpperCase()}`;
      form.querySelector('[name="tipo_proceso"]').value = type;
      form.querySelector('[name="id_usuario"]').value = currentUser?.id || "";
      toggleFields(true);

      if (type === "Entrada") {
        btnBruto.disabled = false;
        btnTara.disabled = true;
        inputBruto.placeholder = "Capturar...";
        inputTara.placeholder = "(Pendiente)";
      } else {
        btnBruto.disabled = true;
        btnTara.disabled = false;
        inputBruto.placeholder = "(Pendiente)";
        inputTara.placeholder = "Capturar...";
      }
    };

    const openCompleteModal = (ticket) => {
      currentMode = "complete";
      toggleModal(true);
      document.getElementById("modal-title").textContent = "Finalizar Ticket";

      form.querySelector('[name="id"]').value = ticket.id;
      form.querySelector('[name="nro_ticket"]').value = ticket.nro_ticket;
      form.querySelector('[name="tipo_proceso"]').value = ticket.tipo;
      form.querySelector('[name="id_usuario"]').value = ticket.id_usuario;

      // --- RESOLVER IDS DE ASIGNACION (Para mostrarlos en inputs visuales) ---
      const asignacion = listData.asignaciones.find(
        (a) => a.id == ticket.id_asignaciones,
      );

      if (asignacion) {
        // Llenar campos hidden con los IDs reales para mantener integridad (aunque no se usan para update de peso)
        form.querySelector('[name="id_vehiculo"]').value =
          asignacion.id_vehiculos;
        form.querySelector('[name="id_chofer"]').value = asignacion.id_chofer;

        // Mostrar nombres en inputs visuales
        const v = listData.vehiculos.find(
          (x) => x.id == asignacion.id_vehiculos,
        );
        if (v)
          document.getElementById("search-id_vehiculo").value =
            getDisplayLabel(v);

        const c = listData.choferes.find((x) => x.id == asignacion.id_chofer);
        if (c)
          document.getElementById("search-id_chofer").value =
            getDisplayLabel(c);
      } else {
        console.warn(
          "No main assignment found for ticket " + ticket.nro_ticket,
        );
      }

      form.querySelector('[name="id_producto"]').value = ticket.id_producto;
      form.querySelector('[name="id_origen"]').value = ticket.id_origen;
      form.querySelector('[name="id_destino"]').value = ticket.id_destino;

      // Fill Visual Inputs Normales
      const p = listData.productos.find((x) => x.id == ticket.id_producto);
      if (p)
        document.getElementById("search-id_producto").value =
          getDisplayLabel(p);

      if (ticket.id_origen)
        document.getElementById("select-origen").value = ticket.id_origen;
      if (ticket.id_destino)
        document.getElementById("select-destino").value = ticket.id_destino;

      inputBruto.value = ticket.peso_bruto || "";
      inputTara.value = ticket.peso_tara || "";
      calculateNeto();

      toggleFields(false); // Readonly

      if (ticket.peso_bruto > 0) {
        btnBruto.disabled = true;
        btnTara.disabled = false;
      } else {
        btnBruto.disabled = false;
        btnTara.disabled = true;
      }
    };

    // --- SUBMIT ---
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      [
        "id",
        "id_vehiculo",
        "id_chofer",
        "id_producto",
        "id_usuario",
        "id_origen",
        "id_destino",
      ].forEach((k) => {
        if (data[k]) data[k] = parseInt(data[k]);
      });
      data.peso_bruto = parseFloat(data.peso_bruto) || 0;
      data.peso_tara = parseFloat(data.peso_tara) || 0;

      try {
        if (currentMode === "create") {
          if (
            !data.id_vehiculo ||
            !data.id_chofer ||
            !data.id_origen ||
            !data.id_destino
          ) {
            alert("Complete todos los campos obligatorios.");
            return;
          }
          if (data.peso_bruto <= 0 && data.peso_tara <= 0) {
            alert("Capture un peso.");
            return;
          }
          await createResource("tickets_pesaje", data);
          alert("Ticket Creado!");
        } else {
          const ticketId = data.id;
          let tipoPeso = "";
          let peso = 0;
          const original = pendingTickets.find((t) => t.id == ticketId);
          if (original) {
            if (!original.peso_bruto && data.peso_bruto > 0) {
              tipoPeso = "bruto";
              peso = data.peso_bruto;
            } else if (!original.peso_tara && data.peso_tara > 0) {
              tipoPeso = "tara";
              peso = data.peso_tara;
            }
          }
          if (!peso) {
            alert("Capture el peso faltante.");
            return;
          }
          await api.post("/tickets_pesaje/registrar_peso", {
            id: ticketId,
            tipo_peso: tipoPeso,
            peso: peso,
          });
          alert("Ticket Finalizado!");
        }
        toggleModal(false);
        loadPendingTickets();
      } catch (err) {
        console.error(err);
        alert("Error: " + (err.response?.data?.error || err.message));
      }
    });

    // --- EVENTS ---
    document.getElementById("btn-entrada").onclick = () =>
      openCreateModal("Entrada");
    document.getElementById("btn-salida").onclick = () =>
      openCreateModal("Salida");
    document.getElementById("btn-close-x").onclick = () => toggleModal(false);
    document.getElementById("btn-cancel").onclick = () => toggleModal(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) toggleModal(false);
    };

    // INIT
    loadLists().then(() => {
      setupSearchListener(
        "search-id_vehiculo",
        "id_vehiculo",
        listData.vehiculos,
      );
      setupSearchListener("search-id_chofer", "id_chofer", listData.choferes);
      setupSearchListener(
        "search-id_producto",
        "id_producto",
        listData.productos,
      );
      loadPendingTickets();
    });
  },
};

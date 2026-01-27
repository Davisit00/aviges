import {
  listResource,
  createResource,
  updateResource,
  getWeighFromTruckScale,
  getUserInfo,
} from "../api.js";

export const TicketsPesajeInterface = {
  template: `
    <div class="tickets-container">
      <div class="header-actions" style="display: flex; gap: 20px; margin-bottom: 20px;">
        <button id="btn-entrada" style="padding: 15px 30px; font-size: 1.2em; background-color: #4CAF50; color: white; cursor: pointer;">
           🚛 Registrar ENTRADA (Materia Prima)
        </button>
        <button id="btn-salida" style="padding: 15px 30px; font-size: 1.2em; background-color: #2196F3; color: white; cursor: pointer;">
           🚚 Registrar SALIDA (Despacho)
        </button>
      </div>

      <div id="error-msg" style="color: red; margin-bottom: 10px; font-weight: bold;"></div>

      <!-- SECCIÓN DE LISTADO DE ESPERA -->
      <div id="wait-list-section">
          <h3>⏳ Vehículos en Planta (En Espera de Segundo Pesaje)</h3>
          <p><i>Haga doble click sobre un vehículo para completar su pesaje y finalizar el ticket.</i></p>
          <table id="pending-tickets-table" border="1" cellpadding="8" cellspacing="0" style="width: 100%; margin-top: 10px;">
            <thead>
                <tr>
                    <th>Ticket #</th>
                    <th>Tipo</th>
                    <th>Placa</th>
                    <th>Producto</th>
                    <th>Chofer</th>
                    <th>1er Peso</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody></tbody>
          </table>
      </div>

      <!-- MODAL / FORMULARIO (Oculto por defecto) -->
      <div id="ticket-modal" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);">
        <div style="background: white; width: 60%; margin: 5% auto; padding: 20px; border-radius: 8px; max-height: 90vh; overflow-y: auto;">
            <h2 id="modal-title">Nuevo Ticket</h2>
            
            <form id="ticket-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                
                <!-- Campos ocultos -->
                <input type="hidden" name="id">
                <input type="hidden" name="id_usuario">
                <input type="hidden" name="estado" value="En Proceso">

                 <!-- Fila 1 -->
                <div>
                    <label>Tipo de Proceso</label>
                    <input type="text" name="tipo_proceso" readonly style="background: #eee;">
                </div>
                 <div style="display:none;">
                    <label>Nro Ticket</label>
                    <input type="text" name="nro_ticket" readonly>
                </div>

                <!-- Fila 2: Selectores con Buscador (Datalist) -->
                <div>
                    <label>Vehículo (Placa)</label>
                    <input list="list-vehiculos" id="search-vehiculo" placeholder="Buscar placa..." autocomplete="off">
                    <datalist id="list-vehiculos"></datalist>
                    <input type="hidden" name="id_vehiculo">
                </div>
                 <div>
                    <label>Chofer</label>
                    <input list="list-choferes" id="search-chofer" placeholder="Buscar chofer..." autocomplete="off">
                    <datalist id="list-choferes"></datalist>
                    <input type="hidden" name="id_chofer">
                </div>

                <!-- Fila 3 -->
                <div style="grid-column: span 2;">
                    <label>Producto</label>
                    <input list="list-productos" id="search-producto" placeholder="Buscar producto..." style="width: 100%;" autocomplete="off">
                    <datalist id="list-productos"></datalist>
                    <input type="hidden" name="id_producto">
                </div>

                <!-- SECCIÓN DE PESOS -->
                <div style="background: #f0f7ff; padding: 10px; grid-column: span 2; border: 1px solid #cce5ff;">
                    <h3 style="margin-top:0;">Pesaje</h3>
                    
                    <div style="display: flex; gap: 20px; align-items: flex-end;">
                        <div style="flex: 1;">
                            <label style="font-weight: bold;">Peso BRUTO (Full)</label>
                            <input type="number" name="peso_bruto" id="input-bruto" readonly style="background: #e9e9e9;">
                            <button type="button" id="btn-cap-bruto" class="capture-btn" style="margin-top: 5px; width: 100%;">⚖️ Capturar Bruto</button>
                        </div>
                        <div style="flex: 1;">
                            <label style="font-weight: bold;">Peso TARA (Vacío)</label>
                            <input type="number" name="peso_tara" id="input-tara" readonly style="background: #e9e9e9;">
                            <button type="button" id="btn-cap-tara" class="capture-btn" style="margin-top: 5px; width: 100%;">⚖️ Capturar Tara</button>
                        </div>
                         <div style="flex: 1;">
                            <label style="font-weight: bold;">Peso NETO</label>
                            <input type="number" name="peso_neto" id="input-neto" readonly style="background: #ffffcc; font-weight: bold;">
                        </div>
                    </div>
                </div>

                <!-- Fila Extras -->
                <div>
                     <label>Cantidad Cestas</label>
                     <input type="number" name="cantidad_cestas">
                </div>
                <div>
                     <label>Peso Avisado (Guía)</label>
                     <input type="number" name="peso_avisado">
                </div>

                <!-- Botones de Acción -->
                <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button type="button" id="btn-cancel" style="padding: 10px 20px; background: #999; color: white; border: none; cursor: pointer;">Cancelar</button>
                    <button type="submit" id="btn-save" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; font-weight: bold;">GUARDAR</button>
                </div>

            </form>
        </div>
      </div>
    </div>
  `,

  setup(permissions = {}) {
    let vehiclesList = [];
    let driversList = [];
    let productsList = [];
    let pendingTickets = [];
    let currentUser = null;
    let currentMode = "create"; // 'create' | 'complete'

    // DOM Elements
    const form = document.getElementById("ticket-form");
    const modal = document.getElementById("ticket-modal");
    const tableBody = document.querySelector("#pending-tickets-table tbody");
    const errorMsg = document.getElementById("error-msg");

    // Inputs
    const inputBruto = document.getElementById("input-bruto");
    const inputTara = document.getElementById("input-tara");
    const inputNeto = document.getElementById("input-neto");
    const btnBruto = document.getElementById("btn-cap-bruto");
    const btnTara = document.getElementById("btn-cap-tara");

    // --- FUNCIONES AUXILIARES ---

    const setError = (msg) => (errorMsg.textContent = msg || "");

    const calculateNeto = () => {
      const b = parseFloat(inputBruto.value) || 0;
      const t = parseFloat(inputTara.value) || 0;
      if (b > 0 && t > 0) {
        inputNeto.value = Math.abs(b - t).toFixed(2);
      } else {
        inputNeto.value = "";
      }
    };

    const toggleModal = (show) => {
      modal.style.display = show ? "block" : "none";
      setError("");
      if (!show) form.reset();
    };

    // --- CARGA DE DATOS ---

    const loadLists = async () => {
      try {
        const [vRes, dRes, pRes, uRes] = await Promise.all([
          listResource("vehiculos", { per_page: 1000 }),
          listResource("choferes", { per_page: 1000 }),
          listResource("productos", { per_page: 1000 }),
          getUserInfo(),
        ]);

        vehiclesList = vRes.data.items || vRes.data;
        driversList = dRes.data.items || dRes.data;
        productsList = pRes.data.items || pRes.data;
        currentUser = uRes.data;

        populateDatalist(
          "list-vehiculos",
          vehiclesList,
          (i) => `${i.placa} - ${i.descripcion || ""}`,
        );
        populateDatalist(
          "list-choferes",
          driversList,
          (i) =>
            `${i.info?.cedula || i.cedula} - ${i.info?.nombre || i.nombre}`,
        );
        populateDatalist(
          "list-productos",
          productsList,
          (i) => `${i.codigo} - ${i.nombre}`,
        );
      } catch (error) {
        setError("Error cargando listas de datos.");
        console.error(error);
      }
    };

    const populateDatalist = (id, items, labelFn) => {
      const dl = document.getElementById(id);
      dl.innerHTML = "";
      items.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = labelFn(item);
        opt.dataset.id = item.id; // Guardamos ID aunque datalist no lo envia nativamente
        dl.appendChild(opt);
      });
    };

    const loadPendingTickets = async () => {
      try {
        // Solo cargamos los que están "En Proceso"
        const res = await listResource("tickets_pesaje", {
          estado: "En Proceso",
          sort: "id",
          order: "desc",
        });
        pendingTickets = res.data.items || res.data || [];
        renderTable();
      } catch (error) {
        setError("Error cargando tickets en espera.");
      }
    };

    const renderTable = () => {
      tableBody.innerHTML = "";
      if (pendingTickets.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No hay vehículos en espera.</td></tr>`;
        return;
      }

      pendingTickets.forEach((ticket) => {
        // Helpers para mostrar nombres
        const vehiculo =
          vehiclesList.find((v) => v.id == ticket.id_vehiculo)?.placa ||
          ticket.id_vehiculo;
        const producto =
          productsList.find((p) => p.id == ticket.id_producto)?.nombre ||
          ticket.id_producto;
        const chofer =
          driversList.find((c) => c.id == ticket.id_chofer)?.nombre ||
          ticket.id_chofer;
        const pesoInicial =
          ticket.peso_bruto > 0
            ? `Bruto: ${ticket.peso_bruto}`
            : `Tara: ${ticket.peso_tara}`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
                <td>${ticket.nro_ticket || ticket.id}</td>
                <td>${ticket.tipo_proceso}</td>
                <td>${vehiculo}</td>
                <td>${producto}</td>
                <td>${chofer}</td>
                <td>${pesoInicial}</td>
                <td>${new Date(ticket.fecha_creacion).toLocaleString()}</td>
                <td><span style="background:orange; padding:2px 5px; border-radius:4px;">${ticket.estado}</span></td>
            `;
        tr.style.cursor = "pointer";
        tr.title = "Doble click para pesar salida";

        // Evento Doble Click para Completar
        tr.addEventListener("dblclick", () => openCompleteModal(ticket));

        tableBody.appendChild(tr);
      });
    };

    // --- LÓGICA DE CAPTURA DE PESO (Reutilizada y Robusta) ---
    const handleCapture = async (inputElement, btnElement) => {
      btnElement.disabled = true;
      btnElement.textContent = "⏳ Leyendo...";
      try {
        const res = await getWeighFromTruckScale();
        console.log("Weigh raw:", res);

        let weight = null;
        if (res.data && typeof res.data === "object") {
          if (res.data.weight !== undefined) weight = res.data.weight;
          else if (res.data.data !== undefined) weight = res.data.data;
          else if (res.data.value !== undefined) weight = res.data.value;
          else if (res.data.reading !== undefined) weight = res.data.reading;
        } else {
          weight = res.data;
        }

        if (weight === null || typeof weight === "object")
          throw new Error("Formato inválido");

        inputElement.value = weight;
        calculateNeto();
      } catch (err) {
        console.error(err);
        alert("Error balanza: " + (err.message || "Desconocido"));
      } finally {
        btnElement.disabled = false;
        btnElement.textContent = "⚖️ Capturar";
        // Bloqueo lógico: si ya hay valor, no deberíamos capturar de nuevo salvo corrección
      }
    };

    btnBruto.addEventListener("click", () =>
      handleCapture(inputBruto, btnBruto),
    );
    btnTara.addEventListener("click", () => handleCapture(inputTara, btnTara));

    // --- APERTURA DE FORMULARIOS ---

    // 1. Crear Nuevo Ticket
    const openCreateModal = (type) => {
      // type: 'Entrada' | 'Salida'
      toggleModal(true);
      currentMode = "create";
      document.getElementById("modal-title").textContent =
        `Registrar Nueva ${type.toUpperCase()}`;

      // Asignar tipo
      form.querySelector('[name="tipo_proceso"]').value = type;
      form.querySelector('[name="id_usuario"]').value = currentUser?.id || "";

      // Resetear IDs ocultos
      form.querySelector('[name="id"]').value = "";
      form.querySelector('[name="peso_bruto"]').value = "";
      form.querySelector('[name="peso_tara"]').value = "";
      form.querySelector('[name="peso_neto"]').value = "";

      // Habilitar campos de selección
      document.getElementById("search-vehiculo").disabled = false;
      document.getElementById("search-chofer").disabled = false;
      document.getElementById("search-producto").disabled = false;

      // Configurar botones de peso según proceso
      if (type === "Entrada") {
        // Entrada: Se pesa Bruto (Lleno). Tara se bloquea (se tomará al salir)
        btnBruto.disabled = false;
        btnTara.disabled = true;
        inputBruto.placeholder = "Capturar...";
        inputTara.placeholder = "Pendiente (Salida)";
      } else {
        // Salida: El camión entra Vacío (Tara) para cargar. Se pesa Tara.
        btnBruto.disabled = true;
        btnTara.disabled = false;
        inputBruto.placeholder = "Pendiente (Salida)";
        inputTara.placeholder = "Capturar...";
      }
    };

    // 2. Completar Ticket Existente
    const openCompleteModal = (ticket) => {
      toggleModal(true);
      currentMode = "complete";
      document.getElementById("modal-title").textContent =
        "Finalizar Ticket (Segundo Pesaje)";

      // Rellenar datos
      form.querySelector('[name="id"]').value = ticket.id;
      form.querySelector('[name="nro_ticket"]').value = ticket.nro_ticket;
      form.querySelector('[name="tipo_proceso"]').value = ticket.tipo_proceso;
      form.querySelector('[name="id_usuario"]').value = ticket.id_usuario;

      // Rellenar visuales de búsqueda
      const v = vehiclesList.find((i) => i.id == ticket.id_vehiculo);
      document.getElementById("search-vehiculo").value = v
        ? `${v.placa} - ${v.descripcion || ""}`
        : "";
      form.querySelector('[name="id_vehiculo"]').value = ticket.id_vehiculo;

      const c = driversList.find((i) => i.id == ticket.id_chofer);
      document.getElementById("search-chofer").value = c
        ? `${c.info?.cedula || c.cedula} - ${c.info?.nombre || c.nombre}`
        : "";
      form.querySelector('[name="id_chofer"]').value = ticket.id_chofer;

      const p = productsList.find((i) => i.id == ticket.id_producto);
      document.getElementById("search-producto").value = p
        ? `${p.codigo} - ${p.nombre}`
        : "";
      form.querySelector('[name="id_producto"]').value = ticket.id_producto;

      form.querySelector('[name="cantidad_cestas"]').value =
        ticket.cantidad_cestas;
      form.querySelector('[name="peso_avisado"]').value = ticket.peso_avisado;

      inputBruto.value = ticket.peso_bruto || "";
      inputTara.value = ticket.peso_tara || "";

      // Bloquear edición de datos maestros (vehiculo, chofer...) en el cierre
      document.getElementById("search-vehiculo").disabled = true;
      document.getElementById("search-chofer").disabled = true;
      document.getElementById("search-producto").disabled = true;

      // Lógica de Pesas para COMPLETAR
      // Si ya tiene Bruto, falta Tara. Si ya tiene Tara, falta Bruto.
      if (ticket.peso_bruto > 0) {
        btnBruto.disabled = true; // Ya pesó
        btnTara.disabled = false; // Toca pesar Tara (Salida vacío)
      } else {
        btnBruto.disabled = false; // Toca pesar Bruto (Salida Lleno)
        btnTara.disabled = true; // Ya pesó
      }
    };

    // Listeners SearchInputs (para rellenar Inputs Hidden)
    const setupSearchListener = (
      searchId,
      listId,
      hiddenName,
      listData,
      labelFn,
    ) => {
      document.getElementById(searchId).addEventListener("input", (e) => {
        const val = e.target.value;
        const hidden = form.querySelector(`[name="${hiddenName}"]`);
        const item = listData.find((i) => labelFn(i) === val);
        hidden.value = item ? item.id : "";
      });
    };

    // --- GUARDAR ---
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setError("");

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Elimina nro_ticket si existe (el backend lo asigna)
      delete data.nro_ticket;

      // Elimina id si está vacío o no existe (solo debe enviarse en actualización)
      if (!data.id) delete data.id;

      // Convierte todos los campos que sean IDs a enteros si existen
      ["id_vehiculo", "id_chofer", "id_producto", "id_usuario"].forEach(
        (key) => {
          if (data[key]) data[key] = parseInt(data[key], 10);
        },
      );

      // Conversión de tipos para otros campos numéricos
      data.peso_bruto = parseFloat(data.peso_bruto) || 0;
      data.peso_tara = parseFloat(data.peso_tara) || 0;
      data.peso_neto = parseFloat(data.peso_neto) || 0;
      data.cantidad_cestas = parseFloat(data.cantidad_cestas) || 0;
      data.peso_avisado = parseFloat(data.peso_avisado) || 0;

      // Validación Básica
      if (!data.id_vehiculo || !data.id_chofer || !data.id_producto) {
        alert("Debe seleccionar Vehículo, Chofer y Producto.");
        return;
      }

      // Determinar Estado
      if (data.peso_bruto > 0 && data.peso_tara > 0) {
        data.estado = "Finalizado";
      } else {
        data.estado = "En Proceso";
      }

      try {
        if (currentMode === "create") {
          await createResource("tickets_pesaje", data);
          alert("Ticket Creado y puesto En Espera.");
        } else {
          if (data.estado !== "Finalizado") {
            if (
              !confirm(
                "Advertencia: Aún falta un peso. ¿Guardar sin finalizar?",
              )
            )
              return;
          }
          const id = data.id;
          delete data.id; // No enviamos ID en body
          await updateResource("tickets_pesaje", id, data);
          if (data.estado === "Finalizado")
            alert("Ticket FINALIZADO correctamente.");
        }
        toggleModal(false);
        loadPendingTickets();
      } catch (err) {
        console.error(err);
        alert(
          "Error al guardar: " + (err.response?.data?.error || err.message),
        );
      }
    });

    // Listeners Botones Principales
    document
      .getElementById("btn-entrada")
      .addEventListener("click", () => openCreateModal("Entrada"));
    document
      .getElementById("btn-salida")
      .addEventListener("click", () => openCreateModal("Salida"));
    document
      .getElementById("btn-cancel")
      .addEventListener("click", () => toggleModal(false));

    // Init
    loadLists().then(() => {
      setupSearchListener(
        "search-vehiculo",
        "list-vehiculos",
        "id_vehiculo",
        vehiclesList,
        (i) => `${i.placa} - ${i.descripcion || ""}`,
      );
      setupSearchListener(
        "search-chofer",
        "list-choferes",
        "id_chofer",
        driversList,
        (i) => `${i.info?.cedula || i.cedula} - ${i.info?.nombre || i.nombre}`,
      );
      setupSearchListener(
        "search-producto",
        "list-productos",
        "id_producto",
        productsList,
        (i) => `${i.codigo} - ${i.nombre}`,
      );
      loadPendingTickets();
    });
  },
};

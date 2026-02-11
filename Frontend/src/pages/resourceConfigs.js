export const resourceConfigs = {
  // --- ELEMENTOS BASE ---
  direcciones: {
    title: "Gestión de Direcciones",
    resource: "direcciones",
    fields: [
      { name: "pais", label: "País", defaultValue: "Venezuela" },
      { name: "estado", label: "Estado", required: true },
      { name: "municipio", label: "Municipio", required: true },
      { name: "sector", label: "Sector", required: true },
      { name: "descripcion", label: "Punto de Referencia" }, // descripción en BD
    ],
  },
  personas: {
    title: "Gestión de Personas",
    resource: "personas",
    fields: [
      { 
        name: "tipo_cedula", 
        label: "Tipo de Cédula", 
        type: "select",
        enumKey: "cedula_tipo",
        required: true 
      },
      { name: "cedula", label: "Número de Cédula", required: true },
      { name: "nombre", label: "Nombre", required: true },
      { name: "apellido", label: "Apellido", required: true },
      { name: "id_direcciones", label: "Dirección", required: true },
      // CAMBIO: Usar estilo FK para crear teléfono
      { name: "id_telefono", label: "Teléfono Principal", required: false },
    ],
  },
  // NUEVO RECURSO PARA EL MODAL
  telefonos: {
    title: "Crear Teléfono",
    resource: "telefonos",
    fields: [
      { name: "numero", label: "Número Telefónico", required: true },
      { name: "operadora", label: "Operadora", defaultValue: "Desconocida" },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        enumKey: "telefonos_tipo",
        required: true,
      },
    ],
  },
  rif: {
    title: "Crear RIF",
    resource: "rif",
    fields: [
      { 
        name: "tipo", 
        label: "Tipo de RIF", 
        type: "select",
        enumKey: "rif_tipo",
        required: true 
      },
      { name: "numero", label: "Número de RIF", required: true },
    ],
  },
  roles: {
    title: "Gestión de Roles",
    resource: "roles",
    fields: [{ name: "nombre", label: "Nombre del Rol", required: true }],
  },
  ubicaciones: {
    title: "Ubicaciones (Orígenes/Destinos)",
    resource: "ubicaciones",
    fields: [
      { name: "nombre", label: "Nombre del Sitio", required: true },
      { 
        name: "tipo", 
        label: "Tipo de Ubicación", 
        type: "select",
        enumKey: "ubicaciones_tipo",
        required: true 
      },
      { name: "id_direcciones", label: "Dirección Física", required: true },
    ],
  },

  // --- RECURSOS PRINCIPALES ---
  usuarios: {
    title: "Gestión de Usuarios",
    resource: "usuarios", // Usamos el endpoint estándar
    fields: [
      { name: "usuario", label: "Usuario (Login)", required: true },
      {
        name: "contrasena",
        label: "Contraseña",
        type: "password",
        required: true,
      },
      { name: "id_roles", label: "Rol Asignado", required: true },
      { name: "id_personas", label: "Datos Personales", required: true },
    ],
  },
  empresas_transporte: {
    title: "Empresas de Transporte",
    resource: "empresas_transporte", // Endpoint estándar - RIF debe agregarse por separado
    fields: [
      { name: "nombre", label: "Razón Social", required: true },
      { name: "id_direcciones", label: "Dirección Fiscal", required: true },
    ],
  },
  granjas: {
    title: "Gestión de Granjas",
    resource: "granjas", // Endpoint estándar
    fields: [
      { name: "id_ubicaciones", label: "Ubicación Asociada", required: true },
      { name: "id_persona_responsable", label: "Persona Responsable", required: true },
    ],
  },
  vehiculos: {
    title: "Gestión de Vehículos",
    resource: "vehiculos",
    fields: [
      { name: "placa", label: "Placa del Vehículo", required: true },
      {
        name: "id_empresas_transportes",
        label: "Empresa de Transporte",
        required: true,
      },
    ],
  },
  choferes: {
    title: "Gestión de Choferes",
    resource: "choferes", // Endpoint estándar
    fields: [
      {
        name: "id_empresas_transportes",
        label: "Empresa de Transporte",
        required: true,
      },
      { name: "id_personas", label: "Datos Personales", required: true },
    ],
  },

  // --- PROCESOS ---
  productos: {
    title: "Gestión de Productos",
    resource: "productos",
    fields: [
      { name: "codigo", label: "Código", readOnly: true },
      { name: "nombre", label: "Nombre del Producto", required: true },
    ],
  },
  galpones: {
    title: "Gestión de Galpones",
    resource: "galpones",
    fields: [
      { name: "id_granja", label: "Granja", required: true },
      {
        name: "nro_galpon",
        label: "Número de Galpón",
        type: "number",
        required: true,
      },
      {
        name: "capacidad",
        label: "Capacidad de Aves",
        type: "number",
        required: true,
      },
    ],
  },
  lotes: {
    title: "Lotes de Aves",
    resource: "lotes",
    fields: [
      { name: "codigo_lote", label: "Código Lote", required: true },
      { name: "id_galpones", label: "Galpón", required: true },
      {
        name: "fecha_alojamiento",
        label: "Fecha Alojamiento",
        type: "date",
        required: true,
      },
      {
        name: "cantidad_aves",
        label: "Cantidad Inicial",
        type: "number",
        required: true,
      },
    ],
  },
  asignaciones: {
    title: "Asignación Chofer-Vehículo",
    resource: "asignaciones",
    fields: [
      { name: "id_vehiculos", label: "Vehículo (Placa)", required: true },
      { name: "id_chofer", label: "Chofer", required: true },
      { name: "fecha", label: "Fecha Inicio", type: "date", required: true },
      { name: "hora", label: "Hora Inicio", type: "time", required: true },
      { name: "active", label: "Activo", type: "checkbox", defaultValue: true },
    ],
  },
  tickets_pesaje: {
    title: "Tickets de Pesaje (Histórico)",
    resource: "tickets_pesaje",
    fields: [
      { name: "nro_ticket", label: "Nro Ticket", readOnly: true },
      { 
        name: "tipo", 
        label: "Tipo Operación",
        type: "select",
        enumKey: "tickets_tipo",
        required: true
      },
      // Muestra relación compleja
      { name: "id_asignaciones", label: "Asignación (Veh/Chofer)" },
      { name: "id_producto", label: "Producto" },
      { name: "id_origen", label: "Origen (Granja/Prov)" },
      { name: "id_destino", label: "Destino (Matadero/Cli)" },

      {
        name: "peso_bruto",
        label: "Bruto (kg)",
        type: "number",
        readOnly: true,
      },
      { name: "peso_tara", label: "Tara (kg)", type: "number", readOnly: true },
      { name: "peso_neto", label: "Neto (kg)", type: "number", readOnly: true },

      { 
        name: "estado", 
        label: "Estado",
        type: "select",
        enumKey: "tickets_estado",
        readOnly: true 
      },
      { name: "created_at", label: "Fecha Registro", readOnly: true },
    ],
  },
};

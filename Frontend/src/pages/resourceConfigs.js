export const resourceConfigs = {
  usuarios: {
    title: "Gestión de Usuarios",
    resource: "usuarios",
    fields: [
      { name: "nombre_usuario", label: "Usuario" },
      {
        name: "contrasena",
        label: "Contraseña",
        type: "password",
      },
      { name: "nombre", label: "Nombre" },
      { name: "apellido", label: "Apellido" },
      { name: "id_rol", label: "Rol" },
      { name: "fecha_creacion", label: "Fecha", readOnly: true },
    ],
  },
  roles: {
    title: "Gestión de Roles",
    resource: "roles",
    fields: [{ name: "nombre", label: "Nombre del Rol" }],
  },
  productos: {
    title: "Gestión de Productos",
    resource: "productos",
    fields: [
      { name: "codigo", label: "Código", readOnly: true },
      { name: "nombre", label: "Nombre" },
      { name: "es_ave_viva", label: "Ave Viva", type: "checkbox" },
    ],
  },
  empresas_transporte: {
    title: "Empresas de Transporte",
    resource: "empresas_transporte",
    fields: [
      { name: "nombre", label: "Nombre" },
      { name: "rif", label: "RIF" },
    ],
  },
  granjas: {
    title: "Gestión de Granjas",
    resource: "granjas",
    fields: [
      { name: "nombre", label: "Nombre" },
      { name: "direccion", label: "Dirección" },
      { name: "dueno", label: "Dueño" },
    ],
  },
  galpones: {
    title: "Gestión de Galpones",
    resource: "galpones",
    fields: [
      { name: "id_granja", label: "Granja" },
      { name: "codigo", label: "Código" },
      { name: "capacidad", label: "Capacidad", type: "number" },
    ],
  },
  vehiculos: {
    title: "Gestión de Vehículos",
    resource: "vehiculos",
    fields: [
      { name: "placa", label: "Placa" },
      { name: "descripcion", label: "Descripción" },
      { name: "id_empresa_transporte", label: "Empresa Transporte" },
      { name: "peso_tara", label: "Tara", type: "number" },
    ],
  },
  choferes: {
    title: "Gestión de Choferes",
    resource: "choferes",
    fields: [
      { name: "cedula", label: "Cédula" },
      { name: "nombre", label: "Nombre" },
      { name: "apellido", label: "Apellido" },
      { name: "id_empresa_transporte", label: "Empresa Transporte" },
    ],
  },
  tickets_pesaje: {
    title: "Tickets de Pesaje",
    resource: "tickets_pesaje",
    fields: [
      { name: "nro_ticket", label: "Nro Ticket" },
      { name: "tipo_proceso", label: "Tipo Proceso" },
      { name: "id_vehiculo", label: "Vehículo" },
      { name: "id_chofer", label: "Chofer" },
      { name: "id_producto", label: "Producto" },
      { name: "id_usuario", label: "Usuario", readOnly: true },
      {
        name: "peso_bruto",
        label: "Peso Bruto (Kg)",
        type: "number",
        readOnly: true,
      },
      {
        name: "peso_tara",
        label: "Peso Tara (Kg)",
        type: "number",
        readOnly: true,
      },
      {
        name: "peso_neto",
        label: "Peso Neto (Kg)",
        type: "number",
        readOnly: true,
      },
      { name: "peso_avisado", label: "Peso Avisado", type: "number" },
      { name: "cantidad_cestas", label: "Cantidad Cestas", type: "number" },
      { name: "fecha_creacion", label: "Fecha Creación", readOnly: true },
      {
        name: "estado",
        label: "Estado",
        readOnly: true,
        defaultValue: "En Proceso",
      },
    ],
  },
  detalles_transporte_aves: {
    title: "Detalles Transporte Aves",
    resource: "detalles_transporte_aves",
    fields: [
      { name: "id_ticket_pesaje", label: "Ticket" },
      { name: "id_granja", label: "Granja" },
      { name: "id_galpon", label: "Galpón" },
      { name: "codigo_lote", label: "Código Lote" },
      { name: "edad_aves_dias", label: "Edad (días)", type: "number" },
      {
        name: "hora_salida_granja",
        label: "Hora Salida",
        type: "datetime-local",
      },
      {
        name: "hora_entrada_romana",
        label: "Hora Entrada",
        type: "datetime-local",
      },
      {
        name: "hora_inicio_proceso",
        label: "Hora Inicio",
        type: "datetime-local",
      },
      { name: "hora_fin_proceso", label: "Hora Fin", type: "datetime-local" },
      {
        name: "aves_transportadas",
        label: "Aves Transportadas",
        type: "number",
      },
      { name: "aves_contadas", label: "Aves Contadas", type: "number" },
      { name: "aves_ahogadas_aho", label: "Aves Ahogadas", type: "number" },
      { name: "aves_por_cesta", label: "Aves por Cesta", type: "number" },
    ],
  },
};

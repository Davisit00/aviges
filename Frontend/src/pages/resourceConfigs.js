export const resourceConfigs = {
  usuarios: {
    title: "Gestión de Usuarios",
    resource: "usuarios",
    fields: [
      { name: "nombre_usuario", label: "Usuario" },
      { name: "nombre", label: "Nombre" },
      { name: "apellido", label: "Apellido" },
      { name: "rol", label: "Rol" },
      { name: "fecha_creacion", label: "Fecha", readOnly: true },
    ],
  },
  productos: {
    title: "Gestión de Productos",
    resource: "productos",
    fields: [
      { name: "codigo", label: "Código" },
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
      { name: "id_granja", label: "ID Granja" },
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
      { name: "id_empresa_transporte", label: "ID Empresa Transporte" },
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
      { name: "id_empresa_transporte", label: "ID Empresa Transporte" },
    ],
  },
  tickets_pesaje: {
    title: "Tickets de Pesaje",
    resource: "tickets_pesaje",
    fields: [{ name: "nro_ticket", label: "Nro Ticket" }],
  },
  detalles_transporte_aves: {
    title: "Detalles Transporte Aves",
    resource: "detalles_transporte_aves",
    fields: [
      { name: "id_ticket_pesaje", label: "ID Ticket" },
      { name: "id_granja", label: "ID Granja" },
      { name: "id_galpon", label: "ID Galpón" },
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

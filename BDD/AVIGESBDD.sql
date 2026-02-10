IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'GestionRomanaAvicola')
BEGIN
    CREATE DATABASE [GestionRomanaAvicola];
END
GO
-- Switch to the newly created database
USE [GestionRomanaAvicola];
GO

CREATE TABLE [Direcciones] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [pais] varchar(100) NOT NULL DEFAULT 'Venezuela',
  [estado] varchar(100) NOT NULL,
  [municipio] varchar(100) NOT NULL,
  [sector] varchar(100) NOT NULL,
  [descripcion] varchar(MAX),
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Empresas_transportes] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_direcciones] integer NOT NULL,
  [rif] varchar(20) UNIQUE NOT NULL,
  [nombre] varchar(100) NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Personas] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_direcciones] integer NOT NULL,
  [nombre] varchar(100) NOT NULL,
  [apellido] varchar(100) NOT NULL,
  [cedula] varchar(20) UNIQUE NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Personas_direcciones] (
  id integer PRIMARY KEY IDENTITY(1, 1),
  id_personas integer NOT NULL,
  id_direcciones integer NOT NULL,
  is_deleted bit NOT NULL DEFAULT (0),
  created_at datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Empresas_direcciones] (
  id integer PRIMARY KEY IDENTITY(1, 1),
  id_empresas_transportes integer NOT NULL,
  id_direcciones integer NOT NULL,
  is_deleted bit NOT NULL DEFAULT (0),
  created_at datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Telefonos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [codigo_pais] varchar(10) NULL DEFAULT '+58',
  [operadora] varchar(50) NOT NULL,
  [numero] varchar(20) NOT NULL,
  [tipo] nvarchar(255) NOT NULL CHECK ([tipo] IN ('Celular', 'Casa', 'Trabajo')),
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Personas_telefonos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_personas] integer NOT NULL,
  [id_telefonos] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Empresas_telefonos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_empresas_transportes] integer NOT NULL,
  [id_telefonos] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Usuarios] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_personas] integer NOT NULL,
  [id_roles] integer NOT NULL,
  [usuario] varchar(50) UNIQUE NOT NULL,
  [contraseña] varchar(255) NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Roles] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [nombre] varchar(50) NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Choferes] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_personas] integer NOT NULL,
  [id_empresas_transportes] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Productos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [codigo] varchar(50) UNIQUE NOT NULL,
  [nombre] varchar(100) NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Vehiculos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [placa] varchar(20) UNIQUE NOT NULL,
  [id_empresas_transportes] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Asignaciones] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_vehiculos] integer NOT NULL,
  [id_chofer] integer NOT NULL,
  [fecha] date NOT NULL,
  [hora] time NOT NULL,
  [active] bit NOT NULL DEFAULT (1),
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Ubicaciones] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_direcciones] integer NOT NULL,
  [nombre] varchar(100) NOT NULL,
  [tipo] nvarchar(255) NOT NULL CHECK ([tipo] IN ('Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen')),
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Granjas] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_ubicaciones] integer NOT NULL,
  [rif] varchar(20) UNIQUE NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Galpones] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_granja] integer NOT NULL,
  [nro_galpon] integer NOT NULL,
  [capacidad] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Lotes] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_galpones] integer NOT NULL,
  [codigo_lote] varchar(50) NOT NULL,
  [fecha_alojamiento] date NOT NULL,
  [cantidad_aves] integer NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Ticket_pesaje] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_producto] integer NOT NULL,
  [id_asignaciones] integer NOT NULL,
  [id_usuarios_primer_peso] integer NOT NULL,
  [id_usuarios_segundo_peso] integer,
  [id_origen] integer NOT NULL,
  [id_destino] integer NOT NULL,
  [nro_ticket] varchar(50) UNIQUE NOT NULL,
  [tipo] nvarchar(255) NOT NULL CHECK ([tipo] IN ('Entrada', 'Salida')),
  [peso_bruto] decimal(10,2) NOT NULL,
  [peso_tara] decimal(10,2),
  [peso_neto] decimal(10,2),
  [estado] nvarchar(255) NOT NULL CHECK ([estado] IN ('En proceso', 'Finalizado', 'Anulado')),
  [fecha_primer_peso] datetime NOT NULL,
  [fecha_segundo_peso] datetime,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Viajes_tiempos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_ticket] integer NOT NULL,
  [hora_salida_granja] datetime,
  [hora_llegada_romana] datetime,
  [hora_inicio_descarga] datetime,
  [hora_fin_descarga] datetime,
  [hora_salida_romana] datetime,
  [tiempo_transito] integer,
  [tiempo_espera] integer,
  [tiempo_operacion] integer,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Viajes_conteos] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_ticket] integer NOT NULL,
  [aves_guia] integer NOT NULL,
  [aves_recibidas] integer,
  [aves_faltantes] integer,
  [aves_aho] integer,
  [numero_de_jaulas] integer NOT NULL,
  [peso_promedio_jaulas] decimal(10,2),
  [aves_por_jaula] integer,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Viajes_origen] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_ticket] integer NOT NULL,
  [id_lote] integer NOT NULL,
  [numero_de_orden] varchar(50) NOT NULL,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

CREATE TABLE [Estadisticas] (
  [id] integer PRIMARY KEY IDENTITY(1, 1),
  [id_ticket] integer NOT NULL,
  [porcentaje_aves_faltantes] float,
  [porcentaje_aves_ahogadas] float,
  [peso_promedio_aves] float,
  [is_deleted] bit NOT NULL DEFAULT (0),
  [created_at] datetime NOT NULL DEFAULT (getdate())
)
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'COMPUTED: AS (peso_bruto - peso_tara)',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'Ticket_pesaje',
@level2type = N'Column', @level2name = 'peso_neto';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'COMPUTED: AS (DATEDIFF(minute, hora_inicio_descarga, hora_fin_descarga))',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'Viajes_tiempos',
@level2type = N'Column', @level2name = 'tiempo_operacion';
GO

EXEC sp_addextendedproperty
@name = N'Column_Description',
@value = 'COMPUTED: AS (aves_guia - aves_recibidas)',
@level0type = N'Schema', @level0name = 'dbo',
@level1type = N'Table',  @level1name = 'Viajes_conteos',
@level2type = N'Column', @level2name = 'aves_faltantes';
GO

ALTER TABLE [Personas_direcciones] ADD FOREIGN KEY ([id_personas]) REFERENCES [Personas] ([id])
GO

ALTER TABLE [Personas_direcciones] ADD FOREIGN KEY ([id_direcciones]) REFERENCES [Direcciones] ([id])
GO

ALTER TABLE [Empresas_direcciones] ADD FOREIGN KEY ([id_empresas_transportes]) REFERENCES [Empresas_transportes] ([id])
GO

ALTER TABLE [Empresas_direcciones] ADD FOREIGN KEY ([id_direcciones]) REFERENCES [Direcciones] ([id])
GO

ALTER TABLE [Personas_telefonos] ADD FOREIGN KEY ([id_personas]) REFERENCES [Personas] ([id])
GO

ALTER TABLE [Personas_telefonos] ADD FOREIGN KEY ([id_telefonos]) REFERENCES [Telefonos] ([id])
GO

ALTER TABLE [Empresas_telefonos] ADD FOREIGN KEY ([id_empresas_transportes]) REFERENCES [Empresas_transportes] ([id])
GO

ALTER TABLE [Empresas_telefonos] ADD FOREIGN KEY ([id_telefonos]) REFERENCES [Telefonos] ([id])
GO

ALTER TABLE [Personas] ADD FOREIGN KEY ([id_direcciones]) REFERENCES [Direcciones] ([id])
GO

ALTER TABLE [Ubicaciones] ADD FOREIGN KEY ([id_direcciones]) REFERENCES [Direcciones] ([id])
GO

ALTER TABLE [Empresas_transportes] ADD FOREIGN KEY ([id_direcciones]) REFERENCES [Direcciones] ([id])
GO

ALTER TABLE [Granjas] ADD FOREIGN KEY ([id_ubicaciones]) REFERENCES [Ubicaciones] ([id])
GO

ALTER TABLE [Galpones] ADD FOREIGN KEY ([id_granja]) REFERENCES [Granjas] ([id])
GO

ALTER TABLE [Lotes] ADD FOREIGN KEY ([id_galpones]) REFERENCES [Galpones] ([id])
GO

ALTER TABLE [Choferes] ADD FOREIGN KEY ([id_personas]) REFERENCES [Personas] ([id])
GO

ALTER TABLE [Usuarios] ADD FOREIGN KEY ([id_personas]) REFERENCES [Personas] ([id])
GO

ALTER TABLE [Choferes] ADD FOREIGN KEY ([id_empresas_transportes]) REFERENCES [Empresas_transportes] ([id])
GO

ALTER TABLE [Vehiculos] ADD FOREIGN KEY ([id_empresas_transportes]) REFERENCES [Empresas_transportes] ([id])
GO

ALTER TABLE [Asignaciones] ADD FOREIGN KEY ([id_chofer]) REFERENCES [Choferes] ([id])
GO

ALTER TABLE [Asignaciones] ADD FOREIGN KEY ([id_vehiculos]) REFERENCES [Vehiculos] ([id])
GO

ALTER TABLE [Usuarios] ADD FOREIGN KEY ([id_roles]) REFERENCES [Roles] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_asignaciones]) REFERENCES [Asignaciones] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_producto]) REFERENCES [Productos] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_usuarios_primer_peso]) REFERENCES [Usuarios] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_usuarios_segundo_peso]) REFERENCES [Usuarios] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_origen]) REFERENCES [Ubicaciones] ([id])
GO

ALTER TABLE [Ticket_pesaje] ADD FOREIGN KEY ([id_destino]) REFERENCES [Ubicaciones] ([id])
GO

ALTER TABLE [Viajes_origen] ADD FOREIGN KEY ([id_lote]) REFERENCES [Lotes] ([id])
GO

ALTER TABLE [Viajes_origen] ADD FOREIGN KEY ([id_ticket]) REFERENCES [Ticket_pesaje] ([id])
GO

ALTER TABLE [Viajes_conteos] ADD FOREIGN KEY ([id_ticket]) REFERENCES [Ticket_pesaje] ([id])
GO

ALTER TABLE [Estadisticas] ADD FOREIGN KEY ([id_ticket]) REFERENCES [Ticket_pesaje] ([id])
GO

ALTER TABLE [Viajes_tiempos] ADD FOREIGN KEY ([id_ticket]) REFERENCES [Ticket_pesaje] ([id])
GO

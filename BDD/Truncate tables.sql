-- Deshabilitar restricciones de clave foránea
EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT ALL";

-- Truncar tablas (ordenado para evitar errores de FK)
TRUNCATE TABLE Estadisticas;
TRUNCATE TABLE Viajes_origen;
TRUNCATE TABLE Viajes_conteos;
TRUNCATE TABLE Viajes_tiempos;
TRUNCATE TABLE Ticket_pesaje;
TRUNCATE TABLE Lotes;
TRUNCATE TABLE Galpones;
TRUNCATE TABLE Granjas_telefonos;
TRUNCATE TABLE Granjas;
TRUNCATE TABLE Ubicaciones;
TRUNCATE TABLE Asignaciones;
TRUNCATE TABLE Choferes;
TRUNCATE TABLE Vehiculos;
TRUNCATE TABLE Empresas_telefonos;
TRUNCATE TABLE Empresas_direcciones;
TRUNCATE TABLE Empresas_transportes;
TRUNCATE TABLE Productos;
TRUNCATE TABLE Usuarios;
TRUNCATE TABLE Roles;
TRUNCATE TABLE Personas_telefonos;
TRUNCATE TABLE Personas_direcciones;
TRUNCATE TABLE Personas;
TRUNCATE TABLE Telefonos;
TRUNCATE TABLE Direcciones;
TRUNCATE TABLE RIF;

-- Habilitar restricciones de clave foránea
EXEC sp_msforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL";
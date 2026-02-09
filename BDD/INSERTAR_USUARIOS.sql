USE [GestionRomanaAvicola];
GO

-- Declaración de variables para almacenar los IDs generados
DECLARE @IdDireccion INT;
DECLARE @IdPersona INT;
DECLARE @IdRol INT;

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Insertar Dirección (Requerido por Persona)
    INSERT INTO [Direcciones] (pais, estado, municipio, sector, descripcion)
    VALUES ('Venezuela', 'Carabobo', 'Valencia', 'Zona Industrial', 'Oficina Principal');
    
    -- Obtener el ID de la dirección recién creada
    SET @IdDireccion = SCOPE_IDENTITY();
    PRINT 'Dirección creada con ID: ' + CAST(@IdDireccion AS VARCHAR);

    -- 2. Insertar Persona (Requerido por Usuario)
    -- Se usa el ID de la dirección anterior
    INSERT INTO [Personas] (id_direcciones, nombre, apellido, cedula)
    VALUES (@IdDireccion, 'Administrador', 'Sistema', 'V-00000001');

    -- Obtener el ID de la persona recién creada
    SET @IdPersona = SCOPE_IDENTITY();
    PRINT 'Persona creada con ID: ' + CAST(@IdPersona AS VARCHAR);

    -- 3. Gestionar Rol (Requerido por Usuario)
    -- Verificamos si existe el rol 'admin', si no, lo creamos
    IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE nombre = 'admin')
    BEGIN
        INSERT INTO [Roles] (nombre) VALUES ('admin');
        SET @IdRol = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        SELECT TOP 1 @IdRol = id FROM [Roles] WHERE nombre = 'admin';
    END
    PRINT 'Rol asignado ID: ' + CAST(@IdRol AS VARCHAR);

    -- 4. Insertar Usuario
    -- Contraseña es '123456'. El hash es formato Werkzeug (scrypt)
    INSERT INTO [Usuarios] (id_personas, id_roles, usuario, contraseña)
    VALUES (
        @IdPersona, 
        @IdRol, 
        'admin', 
        'scrypt:32768:8:1$xXYuMEVsZSFHKYsd$1c113ff17ebdbd711ccdf7d0c3a7c454af2ed210d991d7be97121eb597c4411be3559786f3af6b3d32eef50fd0f37129dc7e1a88f6cd3682d3950d48a879d038'
    );

    PRINT 'Usuario "admin" creado exitosamente con contraseña "123456".';
    
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error al insertar usuario: ' + ERROR_MESSAGE();
END CATCH;
GO
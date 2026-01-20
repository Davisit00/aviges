-- CREACI�N DE LA BASE DE DATOS
CREATE DATABASE GestionRomanaAvicola;
GO

USE GestionRomanaAvicola;
GO

-- =============================================
-- 1. SEGURIDAD Y ACCESO
-- =============================================

CREATE TABLE Usuarios (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre_usuario VARCHAR(50) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL, -- Hash largo para seguridad
    nombre_completo VARCHAR(100) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('Admin', 'Operador', 'Auditor')), -- Validaci�n simple
    fecha_creacion DATETIME2 DEFAULT GETDATE()
);
GO

-- =============================================
-- 2. CAT�LOGOS (Datos Maestros)
-- =============================================

CREATE TABLE Empresas_Transporte (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    rif VARCHAR(20)
);
GO

CREATE TABLE Granjas (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    dueno VARCHAR(100)
);
GO

CREATE TABLE Productos (
    id INT PRIMARY KEY IDENTITY(1,1),
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    es_ave_viva BIT DEFAULT 0 -- 1 = S�, 0 = No (Para activar pesta�as extra)
);
GO

-- Tablas dependientes de cat�logos

CREATE TABLE Galpones (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_granja INT NOT NULL,
    codigo VARCHAR(20) NOT NULL, -- Ej: 'G-01'
    capacidad INT,
    CONSTRAINT FK_Galpones_Granjas FOREIGN KEY (id_granja) REFERENCES Granjas(id)
);
GO

CREATE TABLE Vehiculos (
    id INT PRIMARY KEY IDENTITY(1,1),
    placa VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(100), -- Ej: Aves vivas, Alimento
    id_empresa_transporte INT,
    peso_tara DECIMAL(18, 2) DEFAULT 0.00, -- Tara predeterminada
    CONSTRAINT FK_Vehiculos_Empresas FOREIGN KEY (id_empresa_transporte) REFERENCES Empresas_Transporte(id)
);
GO

CREATE TABLE Choferes (
    id INT PRIMARY KEY IDENTITY(1,1),
    cedula VARCHAR(20) NOT NULL UNIQUE,
    nombre_completo VARCHAR(100) NOT NULL,
    id_empresa_transporte INT, -- Opcional
    CONSTRAINT FK_Choferes_Empresas FOREIGN KEY (id_empresa_transporte) REFERENCES Empresas_Transporte(id)
);
GO

-- =============================================
-- 3. PROCESOS (La Romana / Software Actual)
-- =============================================

CREATE TABLE Tickets_Pesaje (
    id INT PRIMARY KEY IDENTITY(1,1),
    nro_ticket VARCHAR(50) NOT NULL UNIQUE, -- Identificador f�sico o impreso
    tipo_proceso VARCHAR(10) CHECK (tipo_proceso IN ('Entrada', 'Salida')),
    
    -- Relaciones
    id_vehiculo INT NOT NULL,
    id_chofer INT NOT NULL,
    id_producto INT NOT NULL,
    id_usuario INT NOT NULL, -- Auditor�a de quien cre�
    
    -- Datos Num�ricos
    peso_bruto DECIMAL(18, 2) NOT NULL, -- Peso Total M�quina
    peso_tara DECIMAL(18, 2) NOT NULL,  -- Peso Vac�o
    peso_neto AS (peso_bruto - peso_tara), -- CAMPO CALCULADO AUTOM�TICO
    peso_avisado DECIMAL(18, 2),        -- Seg�n Gu�a
    cantidad_cestas INT DEFAULT 0,
    
    -- Auditor�a
    fecha_registro DATETIME2 DEFAULT GETDATE(),
    estado VARCHAR(20) DEFAULT 'Activo', -- Activo / Anulado
    
    -- Constraints FK
    CONSTRAINT FK_Tickets_Vehiculos FOREIGN KEY (id_vehiculo) REFERENCES Vehiculos(id),
    CONSTRAINT FK_Tickets_Choferes FOREIGN KEY (id_chofer) REFERENCES Choferes(id),
    CONSTRAINT FK_Tickets_Productos FOREIGN KEY (id_producto) REFERENCES Productos(id),
    CONSTRAINT FK_Tickets_Usuarios FOREIGN KEY (id_usuario) REFERENCES Usuarios(id)
);
GO

-- =============================================
-- 4. EXTENSI�N AV�COLA (Datos de los Excels)
-- =============================================

CREATE TABLE Detalles_Transporte_Aves (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_ticket_pesaje INT NOT NULL UNIQUE, -- Relaci�n 1 a 1 obligatoria
    
    -- Origen
    id_granja INT NOT NULL,
    id_galpon INT,
    codigo_lote VARCHAR(50),
    edad_aves_dias INT,
    
    -- Tiempos (Excel Formato 2)
    hora_salida_granja DATETIME2,
    hora_entrada_romana DATETIME2,
    hora_inicio_proceso DATETIME2, -- Despacho/Descarga
    hora_fin_proceso DATETIME2,
    
    -- Conteos y Mermas
    aves_transportadas INT DEFAULT 0, -- Declaradas
    aves_contadas INT DEFAULT 0,      -- Reales
    aves_ahogadas_aho INT DEFAULT 0,  -- Muertas
    aves_por_cesta INT,               -- Promedio
    
    -- Constraints FK
    CONSTRAINT FK_Detalles_Tickets FOREIGN KEY (id_ticket_pesaje) REFERENCES Tickets_Pesaje(id),
    CONSTRAINT FK_Detalles_Granjas FOREIGN KEY (id_granja) REFERENCES Granjas(id),
    CONSTRAINT FK_Detalles_Galpones FOREIGN KEY (id_galpon) REFERENCES Galpones(id)
);
GO

-- =============================================
-- 5. LÓGICA DE NEGOCIO (STORED PROCEDURES)
-- =============================================

-- Procedimiento para registrar una ENTRADA (Materia prima o Aves Vivas)
CREATE PROCEDURE SP_Registrar_Entrada
    -- Datos del Ticket General (Software Actual)
    @nro_ticket VARCHAR(50),
    @placa_vehiculo VARCHAR(20),
    @cedula_chofer VARCHAR(20),
    @codigo_producto VARCHAR(20),
    @nombre_usuario VARCHAR(50), -- Usuario que registra
    @peso_bruto DECIMAL(18,2),
    @peso_tara DECIMAL(18,2), -- Puede venir de la tara del vehículo o pesaje
    @peso_avisado DECIMAL(18,2),
    @cantidad_cestas INT,
    
    -- Datos Específicos Avícolas (Formatos Excel) - NULL si no es ave
    @id_granja INT = NULL,
    @codigo_galpon VARCHAR(20) = NULL,
    @codigo_lote VARCHAR(50) = NULL,
    @edad_aves INT = NULL,
    @hora_salida_granja DATETIME2 = NULL,
    @aves_transportadas INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Obtener IDs relacionales (Validación básica)
        DECLARE @id_vehiculo INT = (SELECT id FROM Vehiculos WHERE placa = @placa_vehiculo);
        DECLARE @id_chofer INT = (SELECT id FROM Choferes WHERE cedula = @cedula_chofer);
        DECLARE @id_producto INT = (SELECT id FROM Productos WHERE codigo = @codigo_producto);
        DECLARE @id_usuario INT = (SELECT id FROM Usuarios WHERE nombre_usuario = @nombre_usuario);
        
        -- Verificar si es ave viva para exigir datos extra
        DECLARE @es_ave_viva BIT = (SELECT es_ave_viva FROM Productos WHERE id = @id_producto);

        IF @id_vehiculo IS NULL OR @id_chofer IS NULL OR @id_producto IS NULL
        BEGIN
            THROW 51000, 'Error: Vehículo, Chofer o Producto no existen en catálogos.', 1;
        END

        -- 2. Insertar Ticket Cabecera
        INSERT INTO Tickets_Pesaje (
            nro_ticket, tipo_proceso, id_vehiculo, id_chofer, id_producto,
            id_usuario, peso_bruto, peso_tara, peso_avisado, cantidad_cestas
        )
        VALUES (
            @nro_ticket, 'Entrada', @id_vehiculo, @id_chofer, @id_producto,
            @id_usuario, @peso_bruto, @peso_tara, @peso_avisado, @cantidad_cestas
        );

        DECLARE @new_ticket_id INT = SCOPE_IDENTITY();

        -- 3. Si es Ave Viva, insertar detalles (Lógica del Excel)
        IF @es_ave_viva = 1
        BEGIN
            IF @id_granja IS NULL OR @codigo_lote IS NULL
            BEGIN
                THROW 51000, 'Error: Para Aves Vivas, la Granja y el Lote son obligatorios.', 1;
            END

            -- Buscar ID Galpón si se proveyó código
            DECLARE @id_galpon INT = NULL;
            IF @codigo_galpon IS NOT NULL
                SELECT @id_galpon = id FROM Galpones WHERE codigo = @codigo_galpon AND id_granja = @id_granja;

            INSERT INTO Detalles_Transporte_Aves (
                id_ticket_pesaje, id_granja, id_galpon, codigo_lote,
                edad_aves_dias, hora_salida_granja, hora_entrada_romana, -- Hora entrada = Ahora
                aves_transportadas
            )
            VALUES (
                @new_ticket_id, @id_granja, @id_galpon, @codigo_lote,
                @edad_aves, @hora_salida_granja, GETDATE(),
                @aves_transportadas
            );
        END

        COMMIT TRANSACTION;
        SELECT @new_ticket_id AS TicketID, 'Registro Exitoso' AS Mensaje;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
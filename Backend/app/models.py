from sqlalchemy import Computed, CheckConstraint
from sqlalchemy.dialects import mssql
from .db import db

# --- Constantes / Enums ---
TIPOS_TELEFONO = ('Celular', 'Casa', 'Trabajo')
TIPOS_CEDULA = ('V', 'E')
TIPOS_RIF = ('J', 'G', 'V', 'E')
TIPOS_UBICACION = ('Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen')
TIPOS_TICKET = ('Entrada', 'Salida')
ESTADOS_TICKET = ('En proceso', 'Finalizado', 'Anulado')

# --- Modelos ---

class RIF(db.Model):
    __tablename__ = "RIF"
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(1), nullable=False)  # J, G, V, E
    # Quitamos unique=True de la columna
    numero = db.Column(db.String(20), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint(tipo.in_(TIPOS_RIF), name="ck_rif_tipo"),
        # Index único filtrado por is_deleted = 0
        db.Index('idx_rif_numero_unique_active', 'numero', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Direcciones(db.Model):
    __tablename__ = "Direcciones"
    id = db.Column(db.Integer, primary_key=True)
    pais = db.Column(db.String(100), nullable=False, default="Venezuela")
    estado = db.Column(db.String(100), nullable=False)
    municipio = db.Column(db.String(100), nullable=False)
    sector = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class PersonasDirecciones(db.Model):
    __tablename__ = "Personas_direcciones"
    id = db.Column(db.Integer, primary_key=True)
    id_personas = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=False)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Personas(db.Model):
    __tablename__ = "Personas"
    id = db.Column(db.Integer, primary_key=True)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    tipo_cedula = db.Column(db.String(1), nullable=False)  # V, E
    # Quitamos unique=True de la columna
    cedula = db.Column(db.String(20), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint(tipo_cedula.in_(TIPOS_CEDULA), name="ck_personas_tipo_cedula"),
        # Index único filtrado por is_deleted = 0
        db.Index('idx_personas_cedula_unique_active', 'cedula', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class PersonasTelefonos(db.Model):
    __tablename__ = "Personas_telefonos"
    id = db.Column(db.Integer, primary_key=True)
    id_personas = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=False)
    # Quitamos unique=True de la columna
    id_telefonos = db.Column(db.Integer, db.ForeignKey("Telefonos.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

    __table_args__ = (
        # Creamos un INDEX que solo aplica UNIQUE cuando is_deleted es 0 (falso)
        db.Index('idx_personas_telefonos_unique_active', 'id_telefonos', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Telefonos(db.Model):
    __tablename__ = "Telefonos"
    id = db.Column(db.Integer, primary_key=True)
    codigo_pais = db.Column(db.String(10), default='+58', nullable=True)
    operadora = db.Column(db.String(50), nullable=False)
    # Quitamos unique=True si existía explicito, lo maneja el índice abajo
    numero = db.Column(db.String(20), nullable=False)
    tipo = db.Column(db.String(255), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint(f"tipo IN {TIPOS_TELEFONO}", name='ck_telefonos_tipo'),
        # Index único filtrado por is_deleted = 0 para permitir reuso de números
        db.Index('idx_telefonos_numero_unique_active', 'numero', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Roles(db.Model):
    __tablename__ = "Roles"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Usuarios(db.Model):
    __tablename__ = "Usuarios"
    id = db.Column(db.Integer, primary_key=True)
    id_personas = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=False)
    id_roles = db.Column(db.Integer, db.ForeignKey("Roles.id"), nullable=False)
    # Quitamos unique=True de la columna
    usuario = db.Column(db.String(50), nullable=False)
    contraseña = db.Column(db.String(255), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    
    __table_args__ = (
        # Index único filtrado por is_deleted = 0
        db.Index('idx_usuarios_usuario_unique_active', 'usuario', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Productos(db.Model):
    __tablename__ = "Productos"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    # Quitamos unique=True de la columna
    codigo = db.Column(db.String(50), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

    __table_args__ = (
        # Index único filtrado por is_deleted = 0
        db.Index('idx_productos_codigo_unique_active', 'codigo', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class EmpresasTransporte(db.Model):
    __tablename__ = "Empresas_transportes"
    id = db.Column(db.Integer, primary_key=True)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    id_rif = db.Column(db.Integer, db.ForeignKey("RIF.id"), nullable=True)  # 1:1 relationship with RIF
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    
    __table_args__ = (
        # Unique constraint for active RIF (allows reuse if soft deleted)
        db.Index('idx_empresas_rif_unique_active', 'id_rif', unique=True, mssql_where=db.text('is_deleted = 0 AND id_rif IS NOT NULL')),
    )

class EmpresasDirecciones(db.Model):
    __tablename__ = "Empresas_direcciones"
    id = db.Column(db.Integer, primary_key=True)
    id_empresas_transportes = db.Column(db.Integer, db.ForeignKey("Empresas_transportes.id"), nullable=False)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class EmpresasTelefonos(db.Model):
    __tablename__ = "Empresas_telefonos"
    id = db.Column(db.Integer, primary_key=True)
    id_empresas_transportes = db.Column(db.Integer, db.ForeignKey("Empresas_transportes.id"), nullable=False)
    # Quitamos unique=True de la columna
    id_telefonos = db.Column(db.Integer, db.ForeignKey("Telefonos.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

    __table_args__ = (
        # Index filtrado
        db.Index('idx_empresas_telefonos_unique_active', 'id_telefonos', unique=True, mssql_where=db.text('is_deleted = 0')),
    )


class Vehiculos(db.Model):
    __tablename__ = "Vehiculos"
    id = db.Column(db.Integer, primary_key=True)
    # Quitamos unique=True de la columna
    placa = db.Column(db.String(20), nullable=False)
    id_empresas_transportes = db.Column(db.Integer, db.ForeignKey("Empresas_transportes.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    
    __table_args__ = (
        # Index único filtrado por is_deleted = 0
        db.Index('idx_vehiculos_placa_unique_active', 'placa', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Choferes(db.Model):
    __tablename__ = "Choferes"
    id = db.Column(db.Integer, primary_key=True)
    id_personas = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=False)
    id_empresas_transportes = db.Column(db.Integer, db.ForeignKey("Empresas_transportes.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Asignaciones(db.Model):
    __tablename__ = "Asignaciones"
    id = db.Column(db.Integer, primary_key=True)
    id_vehiculos = db.Column(db.Integer, db.ForeignKey("Vehiculos.id"), nullable=False)
    id_chofer = db.Column(db.Integer, db.ForeignKey("Choferes.id"), nullable=False)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    active = db.Column(db.Boolean, default=True, server_default="1", nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Ubicaciones(db.Model):
    __tablename__ = "Ubicaciones"
    id = db.Column(db.Integer, primary_key=True)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    tipo = db.Column(db.String(255), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint(f"tipo IN {TIPOS_UBICACION}", name='ck_ubicaciones_tipo'),
    )

class Granjas(db.Model):
    __tablename__ = "Granjas"
    id = db.Column(db.Integer, primary_key=True)
    id_ubicaciones = db.Column(db.Integer, db.ForeignKey("Ubicaciones.id"), nullable=False)
    id_persona_responsable = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=False)
    id_rif = db.Column(db.Integer, db.ForeignKey("RIF.id"), nullable=True)  # 1:1 relationship with RIF
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    
    __table_args__ = (
        # Unique constraint for active RIF (allows reuse if soft deleted)
        db.Index('idx_granjas_rif_unique_active', 'id_rif', unique=True, mssql_where=db.text('is_deleted = 0 AND id_rif IS NOT NULL')),
    )

class GranjasTelefonos(db.Model):
    # Corregimos el typo _tablename__ a __tablename__
    __tablename__ = "Granjas_telefonos"
    id = db.Column(db.Integer, primary_key=True)
    id_granjas = db.Column(db.Integer, db.ForeignKey("Granjas.id"), nullable=False)
    # Quitamos unique=True de la columna
    id_telefonos = db.Column(db.Integer, db.ForeignKey("Telefonos.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    
    __table_args__ = (
        # Index filtrado
        db.Index('idx_granjas_telefonos_unique_active', 'id_telefonos', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class Galpones(db.Model):
    __tablename__ = "Galpones"
    id = db.Column(db.Integer, primary_key=True)
    id_granja = db.Column(db.Integer, db.ForeignKey("Granjas.id"), nullable=False)
    nro_galpon = db.Column(db.Integer, nullable=False)
    capacidad = db.Column(db.Integer, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Lotes(db.Model):
    __tablename__ = "Lotes"
    id = db.Column(db.Integer, primary_key=True)
    id_galpones = db.Column(db.Integer, db.ForeignKey("Galpones.id"), nullable=False)
    codigo_lote = db.Column(db.String(50), nullable=False)
    fecha_alojamiento = db.Column(db.Date, nullable=False)
    cantidad_aves = db.Column(db.Integer, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class TicketPesaje(db.Model):
    __tablename__ = "Ticket_pesaje"
    id = db.Column(db.Integer, primary_key=True)
    id_producto = db.Column(db.Integer, db.ForeignKey("Productos.id"), nullable=False)
    id_asignaciones = db.Column(db.Integer, db.ForeignKey("Asignaciones.id"), nullable=False)
    id_usuarios_primer_peso = db.Column(db.Integer, db.ForeignKey("Usuarios.id"), nullable=False)
    id_usuarios_segundo_peso = db.Column(db.Integer, db.ForeignKey("Usuarios.id"))
    id_origen = db.Column(db.Integer, db.ForeignKey("Ubicaciones.id"), nullable=False)
    id_destino = db.Column(db.Integer, db.ForeignKey("Ubicaciones.id"), nullable=False)
    # Quitamos unique=True de la columna
    nro_ticket = db.Column(db.String(50), nullable=False)
    tipo = db.Column(db.String(255), nullable=False)
    peso_bruto = db.Column(db.Numeric(10, 2), nullable=False)
    peso_tara = db.Column(db.Numeric(10, 2))
    
    # Columna calculada: peso_bruto - peso_tara
    peso_neto = db.Column(db.Numeric(10, 2), Computed("peso_bruto - peso_tara"))
    
    estado = db.Column(db.String(255), nullable=False)
    fecha_primer_peso = db.Column(db.DateTime, nullable=False)
    fecha_segundo_peso = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint(f"tipo IN {TIPOS_TICKET}", name='ck_ticket_pesaje_tipo'),
        CheckConstraint(f"estado IN {ESTADOS_TICKET}", name='ck_ticket_pesaje_estado'),
        # Index único filtrado por is_deleted = 0
        db.Index('idx_ticket_pesaje_nro_ticket_unique_active', 'nro_ticket', unique=True, mssql_where=db.text('is_deleted = 0')),
    )

class ViajesTiempos(db.Model):
    __tablename__ = "Viajes_tiempos"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    hora_salida_granja = db.Column(db.DateTime)
    hora_llegada_romana = db.Column(db.DateTime)
    hora_inicio_descarga = db.Column(db.DateTime)
    hora_fin_descarga = db.Column(db.DateTime)
    hora_salida_romana = db.Column(db.DateTime)
    
    # Calculos de tiempos (DATEDIFF devuelve la diferencia, aquí en minutos)
    tiempo_transito = db.Column(db.Integer) # Este suele ser complejo de calcular auto sin dos campos claros
    tiempo_espera = db.Column(db.Integer)
    
    # Columna calculada: diferencia en minutos entre inicio y fin descarga
    tiempo_operacion = db.Column(db.Integer, Computed("DATEDIFF(minute, hora_inicio_descarga, hora_fin_descarga)"))
    
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class ViajesConteos(db.Model):
    __tablename__ = "Viajes_conteos"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    aves_guia = db.Column(db.Integer, nullable=False)
    aves_recibidas = db.Column(db.Integer)
    
    # Columna calculada: aves_guia - aves_recibidas
    aves_faltantes = db.Column(db.Integer, Computed("aves_guia - aves_recibidas"))
    
    aves_aho = db.Column(db.Integer)
    numero_de_jaulas = db.Column(db.Integer, nullable=False)
    peso_promedio_jaulas = db.Column(db.Numeric(10, 2))
    aves_por_jaula = db.Column(db.Integer)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class ViajesOrigen(db.Model):
    __tablename__ = "Viajes_origen"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    id_lote = db.Column(db.Integer, db.ForeignKey("Lotes.id"), nullable=False)
    numero_de_orden = db.Column(db.String(50), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Estadisticas(db.Model):
    __tablename__ = "Estadisticas"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    porcentaje_aves_faltantes = db.Column(db.Float)
    porcentaje_aves_ahogadas = db.Column(db.Float)
    peso_promedio_aves = db.Column(db.Float)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

# Si es la primera vez que ejecutas el proyecto, debes crear la base de datos con el nombre GestionRomanaAvicola (Copiar y pegar por seguridad)
# Luego seguir los pasos de abajo para crear las tablas y relaciones en la base de datos. Recuerda que cada vez que realices cambios en los modelos, debes crear una nueva migración y aplicarla a la base de datos para mantenerla actualizada con el código.
# Si realizas cambios aqui debes realizar las migraciones correspondientes para actualizar la base de datos.
# Si la carpeta migrations no existe, debes crearla con el comando: flask db init
# Luego, para crear una nueva migración: flask db migrate -m "Descripción de la migración"
# Finalmente, para aplicar la migración a la base de datos: flask db upgrade
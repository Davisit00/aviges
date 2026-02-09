from sqlalchemy import Computed, CheckConstraint
from sqlalchemy.dialects import mssql
from .db import db

# Base tables
class Direcciones(db.Model):
    __tablename__ = "Direcciones"
    id = db.Column(db.Integer, primary_key=True)
    pais = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(100), nullable=False)
    municipio = db.Column(db.String(100), nullable=False)
    sector = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Personas(db.Model):
    __tablename__ = "Personas"
    id = db.Column(db.Integer, primary_key=True)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    cedula = db.Column(db.String(20), unique=True, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Telefonos(db.Model):
    __tablename__ = "Telefonos"
    id = db.Column(db.Integer, primary_key=True)
    id_personas = db.Column(db.Integer, db.ForeignKey("Personas.id"), nullable=True) # SE CAMBIÓ A TRUE
    numero = db.Column(db.String(20), nullable=False)
    tipo = db.Column(db.String(255), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint("tipo IN ('Celular', 'Casa', 'Trabajo')", name='ck_telefonos_tipo'),
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
    usuario = db.Column(db.String(50), unique=True, nullable=False)
    contraseña = db.Column(db.String(255), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Productos(db.Model):
    __tablename__ = "Productos"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class EmpresasTransporte(db.Model):
    __tablename__ = "Empresas_transportes"
    id = db.Column(db.Integer, primary_key=True)
    id_direcciones = db.Column(db.Integer, db.ForeignKey("Direcciones.id"), nullable=False)
    rif = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class Vehiculos(db.Model):
    __tablename__ = "Vehiculos"
    id = db.Column(db.Integer, primary_key=True)
    placa = db.Column(db.String(20), unique=True, nullable=False)
    id_empresas_transportes = db.Column(db.Integer, db.ForeignKey("Empresas_transportes.id"), nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

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
        CheckConstraint("tipo IN ('Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen')", name='ck_ubicaciones_tipo'),
    )

class Granjas(db.Model):
    __tablename__ = "Granjas"
    id = db.Column(db.Integer, primary_key=True)
    id_ubicaciones = db.Column(db.Integer, db.ForeignKey("Ubicaciones.id"), nullable=False)
    rif = db.Column(db.String(20), unique=True, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

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
    cantidad_aves = db.Column(db.Integer, nullable=False)
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
    nro_ticket = db.Column(db.String(50), unique=True, nullable=False)
    tipo = db.Column(db.String(255), nullable=False)
    peso_bruto = db.Column(db.Numeric(10, 2), nullable=False)
    peso_tara = db.Column(db.Numeric(10, 2))
    peso_neto = db.Column(db.Numeric(10, 2))
    estado = db.Column(db.String(255), nullable=False)
    fecha_primer_peso = db.Column(db.DateTime, nullable=False)
    fecha_segundo_peso = db.Column(db.DateTime)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)
    __table_args__ = (
        CheckConstraint("tipo IN ('Entrada', 'Salida')", name='ck_ticket_pesaje_tipo'),
        CheckConstraint("estado IN ('En proceso', 'Finalizado', 'Anulado')", name='ck_ticket_pesaje_estado'),
    )

class ViajesTiempos(db.Model):
    __tablename__ = "Viajes_tiempos"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    hora_salida_granja = db.Column(db.DateTime)
    hora_inicio_descarga = db.Column(db.DateTime)
    hora_fin_descarga = db.Column(db.DateTime)
    tiempo_transito = db.Column(db.Integer)
    tiempo_espera = db.Column(db.Integer)
    tiempo_operacion = db.Column(db.Integer)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.getdate(), nullable=False)

class ViajesConteos(db.Model):
    __tablename__ = "Viajes_conteos"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket = db.Column(db.Integer, db.ForeignKey("Ticket_pesaje.id"), nullable=False)
    aves_guia = db.Column(db.Integer, nullable=False)
    aves_recibidas = db.Column(db.Integer)
    aves_faltantes = db.Column(db.Integer)
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
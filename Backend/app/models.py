from sqlalchemy import Computed, CheckConstraint
from sqlalchemy.dialects import mssql
from .db import db

class Usuarios(db.Model):
    __tablename__ = "Usuarios"
    id = db.Column(db.Integer, primary_key=True)
    nombre_usuario = db.Column(db.String(50), unique=True, nullable=False)
    contrasena_hash = db.Column(db.String(255), nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    rol = db.Column(db.String(20), nullable=False)
    fecha_creacion = db.Column(mssql.DATETIME2, server_default=db.func.getdate())

class EmpresasTransporte(db.Model):
    __tablename__ = "Empresas_Transporte"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    rif = db.Column(db.String(20))

class Granjas(db.Model):
    __tablename__ = "Granjas"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(200))
    dueno = db.Column(db.String(100))

class Productos(db.Model):
    __tablename__ = "Productos"
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(100), nullable=False)
    es_ave_viva = db.Column(db.Boolean, server_default="0")

class Galpones(db.Model):
    __tablename__ = "Galpones"
    id = db.Column(db.Integer, primary_key=True)
    id_granja = db.Column(db.Integer, db.ForeignKey("Granjas.id"), nullable=False)
    codigo = db.Column(db.String(20), nullable=False)
    capacidad = db.Column(db.Integer)

class Vehiculos(db.Model):
    __tablename__ = "Vehiculos"
    id = db.Column(db.Integer, primary_key=True)
    placa = db.Column(db.String(20), unique=True, nullable=False)
    descripcion = db.Column(db.String(100))
    id_empresa_transporte = db.Column(db.Integer, db.ForeignKey("Empresas_Transporte.id"))
    peso_tara = db.Column(db.Numeric(18, 2), server_default="0.00")

class Choferes(db.Model):
    __tablename__ = "Choferes"
    id = db.Column(db.Integer, primary_key=True)
    cedula = db.Column(db.String(20), unique=True, nullable=False)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    id_empresa_transporte = db.Column(db.Integer, db.ForeignKey("Empresas_Transporte.id"))

class TicketsPesaje(db.Model):
    __tablename__ = "Tickets_Pesaje"
    id = db.Column(db.Integer, primary_key=True)
    nro_ticket = db.Column(db.String(50), unique=True, nullable=False)
    tipo_proceso = db.Column(db.String(10))
    id_vehiculo = db.Column(db.Integer, db.ForeignKey("Vehiculos.id"), nullable=False)
    id_chofer = db.Column(db.Integer, db.ForeignKey("Choferes.id"), nullable=False)
    id_producto = db.Column(db.Integer, db.ForeignKey("Productos.id"), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey("Usuarios.id"), nullable=False)
    peso_bruto = db.Column(db.Numeric(18, 2), nullable=False)
    peso_tara = db.Column(db.Numeric(18, 2), nullable=False)
    peso_neto = db.Column(db.Numeric(19, 2), Computed("peso_bruto - peso_tara"))
    peso_avisado = db.Column(db.Numeric(18, 2))
    cantidad_cestas = db.Column(db.Integer, server_default="0")
    fecha_registro = db.Column(mssql.DATETIME2, server_default=db.func.getdate())
    estado = db.Column(db.String(20), server_default="Activo")

class DetallesTransporteAves(db.Model):
    __tablename__ = "Detalles_Transporte_Aves"
    id = db.Column(db.Integer, primary_key=True)
    id_ticket_pesaje = db.Column(db.Integer, db.ForeignKey("Tickets_Pesaje.id"), nullable=False, unique=True)
    id_granja = db.Column(db.Integer, db.ForeignKey("Granjas.id"), nullable=False)
    id_galpon = db.Column(db.Integer, db.ForeignKey("Galpones.id"))
    codigo_lote = db.Column(db.String(50))
    edad_aves_dias = db.Column(db.Integer)
    hora_salida_granja = db.Column(mssql.DATETIME2)
    hora_entrada_romana = db.Column(mssql.DATETIME2)
    hora_inicio_proceso = db.Column(mssql.DATETIME2)
    hora_fin_proceso = db.Column(mssql.DATETIME2)
    aves_transportadas = db.Column(db.Integer, server_default="0")
    aves_contadas = db.Column(db.Integer, server_default="0")
    aves_ahogadas_aho = db.Column(db.Integer, server_default="0")
    aves_por_cesta = db.Column(db.Integer)
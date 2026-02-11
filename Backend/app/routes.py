from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import serial
import serial.tools.list_ports 
import datetime
import uuid

from .models import (
    Usuarios, Roles, EmpresasTransporte, Granjas, Productos, Galpones,
    Vehiculos, Choferes, TicketPesaje, Direcciones, Personas, Telefonos,
    Ubicaciones, Asignaciones, Lotes, ViajesTiempos, ViajesConteos, 
    ViajesOrigen, Estadisticas, RIF,
    # Tablas intermedias
    PersonasTelefonos, PersonasDirecciones, 
    EmpresasDirecciones, EmpresasTelefonos, EmpresasRIF,
    GranjasTelefonos, GranjasRIF
)
from .services.crud import CRUDService
from .services.validation import validate_payload
from .jwt_blocklist import jwt_blocklist
from . import db

api_bp = Blueprint("api", __name__)

# Constantes de configuración
DEFAULT_COUNTRY = "Venezuela"

@api_bp.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

MODEL_MAP = { 
    "usuarios": Usuarios,
    "roles": Roles,
    "empresas_transporte": EmpresasTransporte,
    "granjas": Granjas,
    "productos": Productos,
    "galpones": Galpones,
    "vehiculos": Vehiculos,
    "choferes": Choferes,
    "tickets_pesaje": TicketPesaje,
    "direcciones": Direcciones,
    "personas": Personas,
    "telefonos": Telefonos,
    "ubicaciones": Ubicaciones,
    "asignaciones": Asignaciones,
    "lotes": Lotes,
    "viajes_tiempos": ViajesTiempos,
    "viajes_conteos": ViajesConteos,
    "viajes_origen": ViajesOrigen,
    "estadisticas": Estadisticas,
}

def serialize(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

# --- HELPERS PARA LOGICA COMPLEJA DE NEGOCIO ---

class TransactionHelper:
    """
    Clase utilitaria para manejar la lógica de 'Buscar o Crear' y relaciones N:M
    requeridas por la nueva estructura de base de datos.
    """
    
    @staticmethod
    def get_or_create_direccion(data):
        """
        Si data tiene 'id', busca la dirección.
        Si no, crea una nueva.
        Retorna la instancia de Direcciones.
        """
        if "id" in data:
            d = Direcciones.query.get(data["id"])
            if not d:
                raise ValueError(f"Dirección con ID {data['id']} no encontrada")
            return d
        else:
            # Validar campos requeridos
            required_fields = ["estado", "municipio", "sector"]
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                raise ValueError(f"Campos requeridos para crear dirección: {', '.join(missing)}")
            
            # Default pais
            if "pais" not in data: 
                data["pais"] = DEFAULT_COUNTRY
            
            nuevo = Direcciones(**data)
            db.session.add(nuevo)
            db.session.flush() # Para obtener ID
            return nuevo

    @staticmethod
    def process_telefono(data, owner_id, AssociationModel, owner_fk_field):
        """
        Maneja la lógica de teléfonos:
        1. Si se envia ID, solo asocia.
        2. Si se envia numero:
           - Busca si existe en Telefonos.
           - Si existe: Verifica si ya está asociado en la tabla intermedia.
             - Si asociado y !deleted -> Error (ya en uso).
             - Si asociado y deleted -> Reactiva (is_deleted=0).
             - Si no asociado -> Crea asociación.
           - Si no existe: Crea Telefono y Asociación.
        """
        telefono = None
        
        # Caso 1: ID existente
        if "id" in data:
            telefono = Telefonos.query.get(data["id"])
        
        # Caso 2: Numero y Datos
        elif "numero" in data:
            num = data["numero"]
            telefono = Telefonos.query.filter_by(numero=num).first()
            
            if not telefono:
                if not data.get("operadora"): data["operadora"] = "Desconocida"
                if not data.get("tipo"): data["tipo"] = "Celular"
                telefono = Telefonos(**data)
                db.session.add(telefono)
                db.session.flush()
        
        if not telefono:
            return # Nada que hacer si no hay datos validos

        # Gestionar Asociación (Tabla Intermedia)
        # Buscar asociación existente (incluso soft-deleted)
        filters = {
            "id_telefonos": telefono.id,
            owner_fk_field: owner_id
        }
        
        # Nota: SQLAlchemy query filter dinámico
        assoc_query = AssociationModel.query.filter_by(**filters)
        # Queremos ver incluso los borrados, así que no filtramos is_deleted=False aquí
        existing_assoc = assoc_query.first() 

        if existing_assoc:
            if not existing_assoc.is_deleted:
                # Ya existe y está activo -> Error o Ignorar (depende de regla de negocio, user dice Error si esta asociado a OTRA persona, pero aqui verificamos al mismo owner)
                # Verificamos si el telefono está asociado a OTRO owner activo?
                # user logic: "si está registrado y asociado a otra persona enviar el error"
                # Eso requeriría buscar en TODA la tabla de asociación por id_telefono
                check_other = AssociationModel.query.filter_by(id_telefonos=telefono.id, is_deleted=False).filter(getattr(AssociationModel, owner_fk_field) != owner_id).first()
                if check_other:
                    raise ValueError(f"El teléfono {telefono.numero} ya está asociado a otro registro activo.")
                pass # Ya es mio y activo, todo bien
            else:
                # Es mio pero estaba borrado -> Reactivar
                existing_assoc.is_deleted = False
        else:
            # Check si pertenece a otro antes de asociar
            check_other = AssociationModel.query.filter_by(id_telefonos=telefono.id, is_deleted=False).first()
            if check_other:
                 raise ValueError(f"El teléfono {telefono.numero} ya está asociado a otro registro.")
            
            # Crear nueva asociación
            new_assoc = AssociationModel(**filters)
            db.session.add(new_assoc)

    @staticmethod
    def process_rif(data, owner_id, AssociationModel, owner_fk_field):
        """Lógica similar a telefonos pero para RIF"""
        rif_obj = None
        
        if "id" in data:
            rif_obj = RIF.query.get(data["id"])
        elif "numero" in data and "tipo" in data:
            rif_obj = RIF.query.filter_by(numero=data["numero"], tipo=data["tipo"]).first()
            if not rif_obj:
                rif_obj = RIF(**data)
                db.session.add(rif_obj)
                db.session.flush()
        
        if not rif_obj: return

        filters = {"id_rif": rif_obj.id, owner_fk_field: owner_id}
        existing_assoc = AssociationModel.query.filter_by(**filters).first()

        if existing_assoc:
            if existing_assoc.is_deleted:
                existing_assoc.is_deleted = False
            # Si existe y activo, ya está listo
        else:
            # Check unique global active
            check_other = AssociationModel.query.filter_by(id_rif=rif_obj.id, is_deleted=False).first()
            if check_other:
                raise ValueError(f"El RIF {rif_obj.tipo}-{rif_obj.numero} ya está asociado a otro registro.")
            
            new_assoc = AssociationModel(**filters)
            db.session.add(new_assoc)

    @staticmethod
    def ensure_empresa_transporte(data_empresa, data_default_responsable=None):
        """
        Retorna ID de EmpresaTransporte. Crea todo el árbol si es nueva.
        """
        if "id" in data_empresa:
            return data_empresa["id"]

        # Datos necesarios para crear
        dir_data = data_empresa.pop("direccion", {})
        tlf_data = data_empresa.pop("telefonos", [])
        rif_data = data_empresa.pop("rif", {}) # Objeto RIF

        # 1. Direccion (Empresas requiere id_direcciones Y EmpresasDirecciones)
        direccion = TransactionHelper.get_or_create_direccion(dir_data)
        
        # 2. Crear Empresa
        data_empresa["id_direcciones"] = direccion.id
        empresa = EmpresasTransporte(**data_empresa)
        db.session.add(empresa)
        db.session.flush()

        # 3. Asociar Direccion en tabla intermedia
        db.session.add(EmpresasDirecciones(id_empresas_transportes=empresa.id, id_direcciones=direccion.id))

        # 4. Procesar Telefonos
        if isinstance(tlf_data, list):
            for t in tlf_data:
                TransactionHelper.process_telefono(t, empresa.id, EmpresasTelefonos, "id_empresas_transportes")
        elif isinstance(tlf_data, dict) and tlf_data: # Por si viene un solo objeto
             TransactionHelper.process_telefono(tlf_data, empresa.id, EmpresasTelefonos, "id_empresas_transportes")

        # 5. Procesar RIF
        if rif_data:
            TransactionHelper.process_rif(rif_data, empresa.id, EmpresasRIF, "id_empresas_transportes")

        return empresa.id


@api_bp.route("/metadata/enums", methods=["GET"])
@jwt_required()
def get_enums():
    return jsonify({
        "telefonos_tipo": ['Celular', 'Casa', 'Trabajo'],
        "ubicaciones_tipo": ['Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen'],
        "tickets_tipo": ['Entrada', 'Salida'],
        "tickets_estado": ['En proceso', 'Finalizado', 'Anulado'],
        "rif_tipo": ['J', 'G', 'V', 'E'],
        "cedula_tipo": ['V', 'E']
    })

# ---------- AUTH (Sin cambios mayores, solo referencias) ----------
@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    usuario = data.get("usuario")
    contrasena = data.get("contrasena")
    if not usuario or not contrasena:
        return jsonify({"error": "usuario y contrasena son requeridos"}), 400

    user = Usuarios.query.filter_by(usuario=usuario).first()
    if not user or not check_password_hash(user.contraseña, contrasena):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"id_roles": user.id_roles})
    return jsonify({"access_token": token})

@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    if "contrasena" not in data:
        return jsonify({"error": "contrasena es requerida"}), 400
    data["contraseña"] = generate_password_hash(data.pop("contrasena"))
    
    # Validacion rapida, pero idealmente se usa la ruta /combined/usuarios
    ok, err = validate_payload(Usuarios, data, partial=False)
    if not ok: return jsonify({"error": err}), 400
    service = CRUDService(Usuarios)
    obj = service.create(data)
    return jsonify(serialize(obj)), 201

@api_bp.route("/auth/validate", methods=["GET"])
@jwt_required()
def validate_token():
    return jsonify({"valid": True, "user_id": get_jwt_identity(), "user_rol": get_jwt().get("id_roles")})

@api_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blocklist.add(jti)
    return jsonify({"logged_out": True})

@api_bp.route("/auth/validate_admin", methods=["POST"])
@jwt_required()
def validate_admin_credentials():
    """
    Validates admin credentials for romanero users who need admin approval for updates.
    Expects: {"usuario": "admin_username", "contrasena": "admin_password"}
    Returns: {"valid": True/False, "is_admin": True/False}
    """
    data = request.get_json(force=True) or {}
    usuario = data.get("usuario")
    contrasena = data.get("contrasena")
    
    if not usuario or not contrasena:
        return jsonify({"error": "usuario y contrasena son requeridos"}), 400
    
    user = Usuarios.query.filter_by(usuario=usuario, is_deleted=False).first()
    
    # Security: Use same generic message to prevent user enumeration
    if not user or not check_password_hash(user.contraseña, contrasena):
        return jsonify({"valid": False, "is_admin": False, "error": "Credenciales inválidas"}), 200
    
    # Check if user is admin (role 1)
    is_admin = user.id_roles == 1
    
    return jsonify({"valid": True, "is_admin": is_admin}), 200

@api_bp.route("/usuarios/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Get current logged in user information"""
    current_user_id = get_jwt_identity()
    user = Usuarios.query.get(current_user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(serialize(user)), 200


# ---------- COMBINED ENDPOINTS (Heavy Logic Here) ----------

@api_bp.route("/combined/usuarios", methods=["POST"])
@jwt_required()
def create_usuario_combined():
    """Create: Direccion -> Persona -> (RelacionTlf, RelacionDir) -> Usuario"""
    data = request.get_json(force=True) or {}
    
    try:
        persona_data = data.pop("persona", {})
        direccion_data = persona_data.pop("direccion", {}) # Puede ser objeto o {id: X}
        telefonos_data = persona_data.pop("telefonos", []) # Lista de objetos
        
        if not data.get("usuario") or not data.get("contrasena"):
            return jsonify({"error": "usuario, contrasena requeridos"}), 400

        # 1. Direccion (Get or Create)
        try:
            direccion = TransactionHelper.get_or_create_direccion(direccion_data)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # 2. Persona
        # Modelo Personas tiene campo id_direcciones NOT NULL (Constraint fisica)
        persona_data["id_direcciones"] = direccion.id 
        persona = Personas(**persona_data)
        db.session.add(persona)
        db.session.flush()

        # 3. Relaciones Intermedias Persona
        # a) PersonasDirecciones (Requerido por usuario "lo mismo con direccion")
        pd = PersonasDirecciones(id_personas=persona.id, id_direcciones=direccion.id)
        db.session.add(pd)

        # b) PersonasTelefonos
        for t_data in telefonos_data:
            try:
                TransactionHelper.process_telefono(t_data, persona.id, PersonasTelefonos, "id_personas")
            except ValueError as e:
                db.session.rollback()
                return jsonify({"error": str(e)}), 409

        # 4. Usuario
        data["id_personas"] = persona.id
        data["contraseña"] = generate_password_hash(data.pop("contrasena"))
        usuario = Usuarios(**data)
        db.session.add(usuario)
        
        db.session.commit()
        
        return jsonify(serialize(usuario)), 201
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Registro duplicado (Usuario, Cédula o RIf ya existen)"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/choferes", methods=["POST"])
@jwt_required()
def create_chofer_combined():
    """Create Chofer: Check Empresa -> Check Persona (Dir, Tlf) -> Chofer"""
    data = request.get_json(force=True) or {}
    
    try:
        persona_data = data.pop("persona", {})
        direccion_data = persona_data.pop("direccion", {})
        telefonos_data = persona_data.pop("telefonos", [])
        
        # 1. Empresa Transporte (Logic: debe insertarse si no se envia id)
        empresa_id = data.get("id_empresas_transportes")
        empresa_payload = data.pop("empresa_obj", None) # Front debe enviar estructura si va a crear

        if not empresa_id:
            if not empresa_payload:
                return jsonify({"error": "Debe seleccionar una empresa o enviar datos para crearla"}), 400
            # Crear empresa on-the-fly
            empresa_id = TransactionHelper.ensure_empresa_transporte(empresa_payload)
            data["id_empresas_transportes"] = empresa_id

        # 2. Direccion Persona
        direccion = TransactionHelper.get_or_create_direccion(direccion_data)

        # 3. Persona Responsable (Chofer)
        persona_data["id_direcciones"] = direccion.id
        persona = Personas(**persona_data)
        db.session.add(persona)
        db.session.flush()

        # Tablas intermedias Persona
        db.session.add(PersonasDirecciones(id_personas=persona.id, id_direcciones=direccion.id))
        for t_data in telefonos_data:
            TransactionHelper.process_telefono(t_data, persona.id, PersonasTelefonos, "id_personas")

        # 4. Chofer
        data["id_personas"] = persona.id
        chofer = Choferes(**data)
        db.session.add(chofer)
        
        db.session.commit()
        return jsonify(serialize(chofer)), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error: {str(e)}"}), 500

@api_bp.route("/combined/empresas_transporte", methods=["POST"])
@jwt_required()
def create_empresa_combined():
    """Direct route to create companies with all details"""
    data = request.get_json(force=True) or {}
    try:
        # Reutilizamos la lógica del helper
        empresa_id = TransactionHelper.ensure_empresa_transporte(data)
        db.session.commit()
        empresa = EmpresasTransporte.query.get(empresa_id)
        return jsonify(serialize(empresa)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/combined/lotes", methods=["POST"])
@jwt_required()
def create_lote_combined():
    """
    Cadena: Lote -> Galpon -> Granja -> (Ubicacion, Resp, Rif, Tlf)
    """
    data = request.get_json(force=True) or {}
    try:
        # Datos Lote
        codigo = data.get("codigo_lote")
        fecha = data.get("fecha_alojamiento")
        
        # Datos Galpon (ID o Objeto para crear)
        galpon_id = data.get("id_galpones")
        galpon_data = data.pop("galpon_obj", {}) # { "nro_galpon": 1, "capacidad": 5000, "granja_obj": {...} }
        
        if not galpon_id:
            if not galpon_data:
                return jsonify({"error": "Falta id_galpones o galpon_obj"}), 400
            
            # Necesitamos Granja para crear Galpon
            granja_id = galpon_data.get("id_granja")
            granja_data = galpon_data.pop("granja_obj", {})
            
            if not granja_id:
                if not granja_data:
                    return jsonify({"error": "Datos de granja requeridos para crear galpón"}), 400
                
                # --- CREAR GRANJA COMPLETA ---
                # 1. Ubicacion (Necesita Direccion)
                ubicacion_data = granja_data.pop("ubicacion", {})
                dir_data = ubicacion_data.pop("direccion", {})
                
                direccion = TransactionHelper.get_or_create_direccion(dir_data)
                
                # Crear Ubicacion (tipo debe ser Granja)
                ubicacion_data["id_direcciones"] = direccion.id
                if "tipo" not in ubicacion_data: ubicacion_data["tipo"] = "Granja"
                ubicacion = Ubicaciones(**ubicacion_data)
                db.session.add(ubicacion)
                db.session.flush()
                
                # 2. Persona Responsable (Puede ser ID existente o datos para crear)
                persona_responsable_id = granja_data.get("id_persona_responsable")
                persona_resp_data = granja_data.pop("persona_responsable", {})
                
                if not persona_responsable_id:
                    if not persona_resp_data:
                        return jsonify({"error": "Se requiere id_persona_responsable o persona_responsable para nueva granja"}), 400
                    
                    # Crear persona responsable
                    dir_resp_data = persona_resp_data.pop("direccion", {})
                    tlf_resp_data = persona_resp_data.pop("telefonos", [])
                    
                    # Direccion para persona responsable
                    dir_resp = TransactionHelper.get_or_create_direccion(dir_resp_data)
                    persona_resp_data["id_direcciones"] = dir_resp.id
                    
                    persona_resp = Personas(**persona_resp_data)
                    db.session.add(persona_resp)
                    db.session.flush()
                    
                    # Relaciones de persona responsable
                    db.session.add(PersonasDirecciones(id_personas=persona_resp.id, id_direcciones=dir_resp.id))
                    for t in tlf_resp_data:
                        TransactionHelper.process_telefono(t, persona_resp.id, PersonasTelefonos, "id_personas")
                    
                    persona_responsable_id = persona_resp.id
                
                granja_v = Granjas(
                    id_ubicaciones=ubicacion.id, 
                    id_persona_responsable=persona_responsable_id
                )
                db.session.add(granja_v)
                db.session.flush()
                granja_id = granja_v.id
                
                # 3. GranjasTelefonos & GranjasRIF
                tlfs_g = granja_data.pop("telefonos", [])
                rif_g = granja_data.pop("rif", None)
                
                for t in tlfs_g:
                    TransactionHelper.process_telefono(t, granja_id, GranjasTelefonos, "id_granjas")
                
                if rif_g:
                    TransactionHelper.process_rif(rif_g, granja_id, GranjasRIF, "id_granjas")
            
            # Crear Galpon
            galpon_data["id_granja"] = granja_id
            galpon = Galpones(**galpon_data)
            db.session.add(galpon)
            db.session.flush()
            galpon_id = galpon.id

        # Crear Lote
        data["id_galpones"] = galpon_id
        lote = Lotes(**data)
        db.session.add(lote)
        
        db.session.commit()
        return jsonify(serialize(lote)), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/combined/vehiculos", methods=["POST"])
@jwt_required()
def create_vehiculo_combined():
    """Create: Check Empresa -> Vehiculo"""
    data = request.get_json(force=True) or {}
    try:
        empresa_id = data.get("id_empresas_transportes")
        empresa_payload = data.pop("empresa_obj", None)
        
        if not empresa_id:
            if not empresa_payload:
                return jsonify({"error": "Empresa requerida"}), 400
            empresa_id = TransactionHelper.ensure_empresa_transporte(empresa_payload)
            data["id_empresas_transportes"] = empresa_id
            
        vehiculo = Vehiculos(**data)
        db.session.add(vehiculo)
        db.session.commit()
        return jsonify(serialize(vehiculo)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ---------- TICKETS PESAJE (Core Logic) ----------

@api_bp.route("/tickets_pesaje", methods=["POST"])
@jwt_required()
def create_ticket_pesaje():
    """
    Creación compleja de ticket:
    - Producto (ID o crear)
    - Asignacion (Vehiculo, Chofer) -> Ya existente o crear
    - Origen / Destino (IDs o crear Ubicaciones)
    - Nro Ticket Auto
    """
    data = request.get_json(force=True) or {}
    
    try:
        current_user = get_jwt_identity()

        # 1. Producto
        prod_id = data.get("id_producto")
        if not prod_id:
            nom_prod = data.get("producto_nombre")
            if not nom_prod: return jsonify({"error": "id_producto o producto_nombre requeridos"}), 400
            
            # Crear producto basico
            new_code = f"P-{uuid.uuid4().hex[:6].upper()}"
            prod = Productos(nombre=nom_prod, codigo=new_code)
            db.session.add(prod)
            db.session.flush()
            prod_id = prod.id
            data["id_producto"] = prod_id
        
        # 2. Origen (Ubicacion)
        origen_id = data.get("id_origen")
        if not origen_id:
            origen_data = data.pop("origen_obj", {})
            if not origen_data: return jsonify({"error": "id_origen o origen_obj requerido"}), 400
            
            # Crear ubicacion origen
            dir_data = origen_data.pop("direccion", {})
            d = TransactionHelper.get_or_create_direccion(dir_data)
            origen_data["id_direcciones"] = d.id
            u_origen = Ubicaciones(**origen_data)
            db.session.add(u_origen)
            db.session.flush()
            origen_id = u_origen.id
            data["id_origen"] = origen_id

        # 3. Destino (Ubicacion)
        destino_id = data.get("id_destino")
        if not destino_id:
            destino_data = data.pop("destino_obj", {})
            if not destino_data: return jsonify({"error": "id_destino o destino_obj requerido"}), 400
            
            dir_data = destino_data.pop("direccion", {})
            d = TransactionHelper.get_or_create_direccion(dir_data)
            destino_data["id_direcciones"] = d.id
            u_destino = Ubicaciones(**destino_data)
            db.session.add(u_destino)
            db.session.flush()
            destino_id = u_destino.id
            data["id_destino"] = destino_id
            
        if origen_id == destino_id:
            return jsonify({"error": "Origen y Destino no pueden ser iguales"}), 400

        # 4. Asignacion (Vehiculo + Chofer)
        # El usuario dice "una asignacion si no se envia el id"
        asignacion_id = data.get("id_asignaciones")
        if not asignacion_id:
            id_vehiculo = data.get("id_vehiculo")
            id_chofer = data.get("id_chofer")
            
            if not id_vehiculo or not id_chofer:
                # Opcional: Podríamos permitir crear chofer/vehiculo aqui, pero seria excesivamente complejo para un solo endpoint
                return jsonify({"error": "Si no hay asignacion previa, se requieren id_vehiculo y id_chofer"}), 400
            
            # Crear asignacion para este viaje
            now = datetime.datetime.now()
            nueva_asig = Asignaciones(
                id_vehiculos=id_vehiculo,
                id_chofer=id_chofer,
                fecha=now.date(),
                hora=now.time(),
                active=True
            )
            db.session.add(nueva_asig)
            db.session.flush()
            asignacion_id = nueva_asig.id
            data["id_asignaciones"] = asignacion_id

        # Validar campos requeridos que vienen del frontend
        if "tipo" not in data:
            return jsonify({"error": "El campo 'tipo' es requerido (Entrada/Salida)"}), 400
        if data["tipo"] not in ('Entrada', 'Salida'):
            return jsonify({"error": "El campo 'tipo' debe ser 'Entrada' o 'Salida'"}), 400
        if "peso_bruto" not in data:
            return jsonify({"error": "El campo 'peso_bruto' es requerido"}), 400

        # Limpiar payload de campos que no existen en TicketPesaje
        clean_data = {k: v for k, v in data.items() if k in [c.name for c in TicketPesaje.__table__.columns]}
        
        # Defaults
        clean_data["id_usuarios_primer_peso"] = current_user
        if "estado" not in clean_data: clean_data["estado"] = "En proceso"
        clean_data["fecha_primer_peso"] = datetime.datetime.now()
        
        # Nro Ticket Temporal (Constraints unique)
        temp_ticket = f"TMP-{uuid.uuid4().hex[:8]}"
        clean_data["nro_ticket"] = temp_ticket

        ticket = TicketPesaje(**clean_data)
        db.session.add(ticket)
        db.session.flush()  # Get ID without committing

        # Update Nro Ticket Final with the assigned ID
        ticket.nro_ticket = f"TKT-{ticket.id:06d}"
        db.session.commit()  # Single commit with final ticket number

        return jsonify(serialize(ticket)), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tickets_pesaje/registrar_peso", methods=["POST"])
@jwt_required()
def registrar_peso_ticket():
    data = request.get_json(force=True) or {}
    ticket_id = data.get("id")
    tipo_peso = data.get("tipo_peso") 
    peso = data.get("peso")
    current_user_id = get_jwt_identity()

    if not ticket_id or tipo_peso not in ("bruto", "tara") or peso is None:
        return jsonify({"error": "Faltan datos (id, tipo_peso, peso)"}), 400

    ticket = TicketPesaje.query.get(ticket_id)
    if not ticket: return jsonify({"error": "Ticket no encontrado"}), 404

    # Actualizar peso
    if tipo_peso == "bruto": ticket.peso_bruto = peso
    else: ticket.peso_tara = peso

    # Verificar cierre
    if ticket.peso_bruto and ticket.peso_tara:
        # peso_neto es calculado por la base de datos, no lo seteamos aquí
        ticket.estado = "Finalizado"
        ticket.fecha_segundo_peso = datetime.datetime.now()
        ticket.id_usuarios_segundo_peso = current_user_id
    
    db.session.commit()
    return jsonify(serialize(ticket))

# ---------- CRUD STANDARD (Fallback) ----------
@api_bp.route("/<resource>", methods=["GET"])
@jwt_required()
def list_resource(resource):
    model = MODEL_MAP.get(resource)
    if not model: return jsonify({"error": "Recurso no encontrado"}), 404
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    query = model.query.order_by(model.id)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [serialize(x) for x in pagination.items],
        "total": pagination.total,
        "page": page,
        "pages": pagination.pages
    })

@api_bp.route("/<resource>", methods=["POST"])
@jwt_required()
def create_resource_generic(resource):
    """
    CRUD Generico para tablas simples (Roles, Estadisticas, ViajesTiempos, etc.)
    Para tablas complejas se recomienda usar las rutas /combined/
    """
    model = MODEL_MAP.get(resource)
    if not model: return jsonify({"error": "Recurso no encontrado"}), 404
    data = request.get_json(force=True) or {}
    
    # Manejadores especiales simples
    if resource == "viajes_tiempos" or resource == "viajes_conteos" or resource == "viajes_origen":
        if "id_ticket" not in data:
            return jsonify({"error": "id_ticket requerido"}), 400
    
    # Auto-generar codigo para productos si no se proporciona
    if resource == "productos":
        if "codigo" not in data or not data["codigo"]:
            data["codigo"] = f"P-{uuid.uuid4().hex[:6].upper()}"

    try:
        # Procesar RIF para empresas_transporte y granjas
        # El frontend puede enviar: id_rif (FK directo) o rif (objeto con tipo y numero)
        rif_data = None
        rif_id = data.pop("id_rif", None)
        
        if rif_id:
            # Si se proporciona un ID de RIF existente, crear objeto de datos para process_rif
            rif_data = {"id": rif_id}
        else:
            # Si se proporciona un objeto rif con tipo y numero
            rif_data = data.pop("rif", None)
        
        data.pop("id", None)
        obj = model(**data)
        db.session.add(obj)
        db.session.flush()  # Get ID for RIF association
        
        # Si hay datos de RIF, crear la relación
        if rif_data and resource == "empresas_transporte":
            try:
                TransactionHelper.process_rif(rif_data, obj.id, EmpresasRIF, "id_empresas_transportes")
            except ValueError as e:
                db.session.rollback()
                return jsonify({"error": str(e)}), 409
        elif rif_data and resource == "granjas":
            try:
                TransactionHelper.process_rif(rif_data, obj.id, GranjasRIF, "id_granjas")
            except ValueError as e:
                db.session.rollback()
                return jsonify({"error": str(e)}), 409
        
        db.session.commit()
        return jsonify(serialize(obj)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/<resource>/<int:id_>", methods=["PUT", "DELETE", "GET"])
@jwt_required()
def handle_resource_id(resource, id_):
    model = MODEL_MAP.get(resource)
    if not model: return jsonify({"error": "Recurso no encontrado"}), 404
    
    obj = model.query.get_or_404(id_)

    if request.method == "GET":
        return jsonify(serialize(obj))

    if request.method == "DELETE":
        obj.is_deleted = True
        db.session.commit()
        return jsonify({"success": True})

    if request.method == "PUT":
        data = request.get_json(force=True) or {}
        for k, v in data.items():
            if hasattr(obj, k):
                setattr(obj, k, v)
        db.session.commit()
        return jsonify(serialize(obj))

# ---------- SERIAL & PRINTING (Legacy/Utility) ----------
@api_bp.route("/serial/list", methods=["GET"])
@jwt_required()
def list_serial_ports():
    return jsonify([{"device": p.device, "description": p.description} for p in serial.tools.list_ports.comports()])

@api_bp.route("/serial/read", methods=["GET"])
@jwt_required()
def read_serial():
    try:
        with serial.Serial('COM2', 9600, timeout=2) as ser: # Ajustar puerto
            line = ser.readline()
            if line: return jsonify({"data": line.decode('utf-8').strip(), "status": "success"})
            return jsonify({"status": "timeout"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
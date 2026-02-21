from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import serial
import serial.tools.list_ports 
import datetime 
import uuid
from decimal import Decimal
from sqlalchemy import text

from .models import (
    Usuarios, Roles, EmpresasTransporte, Granjas, Productos, Galpones,
    Vehiculos, Choferes, TicketPesaje, Direcciones, Personas, Telefonos,
    Ubicaciones, Asignaciones, Lotes, ViajesTiempos, ViajesConteos, 
    ViajesOrigen, Estadisticas, PersonasTelefonos,
    RIF, EmpresasTelefonos, GranjasTelefonos
)
from .services.crud import CRUDService
from .services.validation import validate_payload
from .jwt_blocklist import jwt_blocklist

api_bp = Blueprint("api", __name__)

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

# --- SERIALIZACION AVANZADA ---

def get_telefonos_for_entity(entity_id, link_model, link_fk_name):
    """Ayuda a obtener lista de teléfonos a través de tablas intermedias"""
    from .models import Telefonos
    links = link_model.query.filter(getattr(link_model, link_fk_name) == entity_id).all()
    # Recolectar IDs
    t_ids = [l.id_telefonos for l in links]
    if not t_ids:
        return []
    
    phones = Telefonos.query.filter(Telefonos.id.in_(t_ids)).all()
    # Serializar recursivamente como objeto 'telefonos' (sin lógica extra por ahora)
    return [clean_data({c.name: getattr(p, c.name) for c in p.__table__.columns}) for p in phones]

def clean_data(data):
    """Elimina campos de sistema y sensibles de un diccionario"""
    keys_to_remove = [
        "created_at", "is_deleted", "contraseña", "contrasena", 
        "password_hash", "modified_at"
    ]
    for key in keys_to_remove:
        data.pop(key, None)
    return data

def expand_resource(data, resource_name, obj):
    """
    Enriquece el diccionario 'data' con objetos anidados basados en las FKs.
    Reemplaza el ID de la FK por el objeto completo.
    """
    
    # --- 1. Expansiones Genéricas (Direcciones, RIF) ---
    # Estas aplican a cualquier recurso que tenga estas columnas
    
    if "id_direcciones" in data:
        if data["id_direcciones"]:
            d = Direcciones.query.get(data["id_direcciones"])
            if d:
                # Serializamos manualmente para evitar ciclos raros, aunque serialize("direcciones") serviria
                d_data = {c.name: getattr(d, c.name) for c in d.__table__.columns}
                data["direccion"] = clean_data(d_data)
        data.pop("id_direcciones", None) # Removemos fk
    
    if "id_rif" in data:
        if data["id_rif"]:
            r = RIF.query.get(data["id_rif"])
            if r:
                r_data = {c.name: getattr(r, c.name) for c in r.__table__.columns}
                data["rif"] = clean_data(r_data)
        data.pop("id_rif", None)

    # --- 2. Lógica Específica por Recurso ---

    if resource_name == "usuarios":
        # Rol (Objeto completo)
        if "id_roles" in data:
            r = Roles.query.get(data["id_roles"])
            if r:
               data["rol"] = serialize(r, "roles")
            data.pop("id_roles", None)
        
        # Persona
        if "id_personas" in data:
            p = Personas.query.get(data["id_personas"])
            if p:
                data["persona"] = serialize(p, "personas")
            data.pop("id_personas", None)

    elif resource_name == "personas":
        # Telefonos
        data["telefonos"] = get_telefonos_for_entity(obj.id, PersonasTelefonos, "id_personas")

    elif resource_name == "choferes":
        # Persona
        if "id_personas" in data:
            p = Personas.query.get(data["id_personas"])
            if p:
                data["persona"] = serialize(p, "personas")
            data.pop("id_personas", None)
        # Empresa
        if "id_empresas_transportes" in data:
            e = EmpresasTransporte.query.get(data["id_empresas_transportes"])
            if e:
                data["empresa"] = serialize(e, "empresas_transporte")
            data.pop("id_empresas_transportes", None)

    elif resource_name == "vehiculos":
        # Empresa
        if "id_empresas_transportes" in data:
            e = EmpresasTransporte.query.get(data["id_empresas_transportes"])
            if e:
                data["empresa"] = serialize(e, "empresas_transporte")
            data.pop("id_empresas_transportes", None)
            
    elif resource_name == "empresas_transporte":
        # Telefonos
        data["telefonos"] = get_telefonos_for_entity(obj.id, EmpresasTelefonos, "id_empresas_transportes")

    elif resource_name == "granjas":
        # Telefonos
        data["telefonos"] = get_telefonos_for_entity(obj.id, GranjasTelefonos, "id_granjas")
        # Ubicacion (que internamente resolvera direccion)
        if "id_ubicaciones" in data:
            u = Ubicaciones.query.get(data["id_ubicaciones"])
            if u:
                data["ubicacion"] = serialize(u, "ubicaciones")
            data.pop("id_ubicaciones", None)
        # Responsable (Persona)
        if "id_persona_responsable" in data:
             p = Personas.query.get(data["id_persona_responsable"])
             if p:
                data["responsable"] = serialize(p, "personas")
             data.pop("id_persona_responsable", None)

    elif resource_name == "galpones":
        # Granja
        if "id_granja" in data:
            # Nota: para evitar bucles infinitos pesados, quiza quieras una serializacion "light" de granja
            # pero aqui usaremos la completa. Si Granja tiene muchos galpones no pasa nada por que la relacion es unidireccional aqui.
            g = Granjas.query.get(data["id_granja"])
            if g:
                data["granja"] = serialize(g, "granjas")
            data.pop("id_granja", None)

    elif resource_name == "lotes":
        # Galpon
        if "id_galpones" in data:
            g = Galpones.query.get(data["id_galpones"])
            if g:
                data["galpon"] = serialize(g, "galpones")
            data.pop("id_galpones", None)

    elif resource_name == "asignaciones":
        # Vehiculo
        if "id_vehiculos" in data:
            v = Vehiculos.query.get(data["id_vehiculos"])
            if v:
                data["vehiculo"] = serialize(v, "vehiculos")
            data.pop("id_vehiculos", None)
        # Chofer
        if "id_chofer" in data:
            from .models import Choferes # local import just in case
            c = Choferes.query.get(data["id_chofer"])
            if c:
                data["chofer"] = serialize(c, "choferes")
            data.pop("id_chofer", None)

    elif resource_name == "tickets_pesaje":
        # Producto
        if "id_producto" in data:
            prod = Productos.query.get(data["id_producto"])
            data["producto"] = serialize(prod, "productos") if prod else None
            data.pop("id_producto", None)

        # Asignaciones (con chofer y vehiculo)
        if "id_asignaciones" in data:
            asignacion = Asignaciones.query.get(data["id_asignaciones"])
            if asignacion:
                asignacion_data = serialize(asignacion, "asignaciones")
                # Expande chofer
                if asignacion_data.get("id_chofer"):
                    chofer = Choferes.query.get(asignacion_data["id_chofer"])
                    if chofer:
                        chofer_data = serialize(chofer, "choferes")
                        # Expande persona del chofer
                        if chofer_data.get("id_personas"):
                            persona = Personas.query.get(chofer_data["id_personas"])
                            if persona:
                                chofer_data["persona"] = serialize(persona, "personas")
                        asignacion_data["chofer"] = chofer_data
                # Expande vehiculo
                if asignacion_data.get("id_vehiculos"):
                    vehiculo = Vehiculos.query.get(asignacion_data["id_vehiculos"])
                    if vehiculo:
                        vehiculo_data = serialize(vehiculo, "vehiculos")
                        asignacion_data["vehiculo"] = vehiculo_data
                data["asignacion"] = asignacion_data
            data.pop("id_asignaciones", None)

        # Usuarios (Operadores)
        if "id_usuarios_primer_peso" in data:
            u1 = Usuarios.query.get(data["id_usuarios_primer_peso"])
            if u1:
                data["operador_entrada"] = {"id": u1.id, "usuario": u1.usuario}
            data.pop("id_usuarios_primer_peso", None)

        if "id_usuarios_segundo_peso" in data and data["id_usuarios_segundo_peso"]:
            u2 = Usuarios.query.get(data["id_usuarios_segundo_peso"])
            if u2:
                data["operador_salida"] = {"id": u2.id, "usuario": u2.usuario}
            data.pop("id_usuarios_segundo_peso", None)

        # Ubicaciones (Origen/Destino)
        if "id_origen" in data:
            ubi_o = Ubicaciones.query.get(data["id_origen"])
            data["origen"] = serialize(ubi_o, "ubicaciones") if ubi_o else None
            data.pop("id_origen", None)

        if "id_destino" in data:
            ubi_d = Ubicaciones.query.get(data["id_destino"])
            data["destino"] = serialize(ubi_d, "ubicaciones") if ubi_d else None
            data.pop("id_destino", None)

    return data

def serialize(obj, resource_name=None):
    data = {}
    for column in obj.__table__.columns:
        value = getattr(obj, column.name)
        # Convierte datetime, date y time a string ISO
        if isinstance(value, (datetime.datetime, datetime.date)):
            data[column.name] = value.isoformat()
        elif isinstance(value, datetime.time):
            data[column.name] = value.strftime("%H:%M:%S")
        else:
            data[column.name] = value
    # Expande recursos si es necesario
    if resource_name:
        data = expand_resource(data, resource_name, obj)
    return data

# --- HELPER FUNCTIONS ---

def process_rif(db, rif_input):
    """
    Gestures the creation or retrieval of a RIF.
    rif_input can be a string "J-12345678" or a dict {"tipo": "J", "numero": "12345678"}
    Returns the RIF object instance.
    """
    tipo = None
    numero = None

    if isinstance(rif_input, str):
        parts = rif_input.split('-')
        if len(parts) >= 2:
            tipo = parts[0]
            numero = parts[1]
    elif isinstance(rif_input, dict):
        tipo = rif_input.get('tipo')
        numero = rif_input.get('numero')

    if not tipo or not numero:
        return None

    # Check existence
    existing = RIF.query.filter_by(tipo=tipo, numero=numero, is_deleted=False).first()
    if existing:
        return existing
    
    new_rif = RIF(tipo=tipo, numero=numero)
    db.session.add(new_rif)
    db.session.flush()
    return new_rif

def process_telefonos(db, telefonos_data):
    """
    Creates phone records. 
    Returns a list of created Telefonos objects.
    """
    created_phones = []
    for t_data in telefonos_data:
        # Check basic validity
        if t_data.get("numero") and t_data.get("operadora"):
            existing = Telefonos.query.filter_by(numero=t_data["numero"], is_deleted=False).first()
            if existing:
                created_phones.append(existing)
            else:
                nuevo_t = Telefonos(**t_data)
                db.session.add(nuevo_t)
                db.session.flush()
                created_phones.append(nuevo_t)
    return created_phones

def process_persona(db, persona_data):
    """
    Busca una persona por cédula. 
    Si existe, actualiza sus datos, dirección y teléfonos.
    Si no existe, la crea.
    Retorna el objeto Personas y la lista de teléfonos procesados.
    """
    cedula = persona_data.get("cedula")
    if not cedula:
        raise ValueError("La cédula es requerida")

    # Extraer data anidada
    direccion_data = persona_data.pop("direccion", {})
    telefonos_data = persona_data.pop("telefonos", [])

    # Buscar existencia
    persona = Personas.query.filter_by(cedula=cedula, is_deleted=False).first()

    if persona:
        # --- ACTUALIZAR EXISTENTE ---
        # 1. Actualizar campos directos
        for k, v in persona_data.items():
            if hasattr(persona, k) and v is not None:
                setattr(persona, k, v)
        
        # 2. Actualizar Dirección
        if direccion_data and persona.id_direcciones:
            direccion = Direcciones.query.get(persona.id_direcciones)
            if direccion:
                for k, v in direccion_data.items():
                    if hasattr(direccion, k) and v is not None:
                        setattr(direccion, k, v)
        elif direccion_data:
            # Caso raro: Persona existe pero no tiene direccion (defensive)
            direccion = Direcciones(**direccion_data)
            db.session.add(direccion)
            db.session.flush()
            persona.id_direcciones = direccion.id
    else:
        # --- CREAR NUEVO ---
        # 1. Crear Dirección
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()

        # 2. Crear Persona
        persona_data["id_direcciones"] = direccion.id
        persona = Personas(**persona_data)
        db.session.add(persona)
        db.session.flush()

    # 3. Procesar Teléfonos (Común para ambos casos)
    created_phones = process_telefonos(db, telefonos_data)
    
    # Vincular teléfonos (evitar duplicados en la tabla intermedia)
    current_links = [l.id_telefonos for l in PersonasTelefonos.query.filter_by(id_personas=persona.id).all()]
    for ph in created_phones:
        if ph.id not in current_links:
            link = PersonasTelefonos(id_personas=persona.id, id_telefonos=ph.id)
            db.session.add(link)
            
    return persona, created_phones

@api_bp.route("/metadata/enums", methods=["GET"])
@jwt_required()
def get_enums():
    return jsonify({
        "telefonos_tipo": ['Celular', 'Casa', 'Trabajo'],
        "ubicaciones_tipo": ['Granja', 'Matadero', 'Balanceados', 'Despresados', 'Incubadora', 'Reciclaje', 'Proveedor', 'Cliente', 'Almacen'],
        "tickets_tipo": ['Entrada', 'Salida'],
        "tickets_estado": ['En proceso', 'Finalizado', 'Anulado']
    })

# ---------- AUTH ----------
@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    
    print("Logging in user with data:", data)
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
    
    ok, err = validate_payload(Usuarios, data, partial=False)
    if not ok:
        return jsonify({"error": err}), 400

    service = CRUDService(Usuarios)
    obj = service.create(data)
    return jsonify(serialize(obj)), 201

@api_bp.route("/auth/validate", methods=["GET"])
@jwt_required()
def validate_token():
    user_id = get_jwt_identity()
    user_rol= get_jwt().get("id_roles")
    return jsonify({"valid": True, "user_id": user_id, "user_rol": user_rol})

@api_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blocklist.add(jti)
    return jsonify({"logged_out": True})

# ---------- COMBINED ENDPOINTS ----------

@api_bp.route("/combined/usuarios", methods=["POST"])
@jwt_required()
def create_usuario_combined():
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        persona_data = data.pop("persona", {})
        
        # Validate required fields
        if not data.get("usuario") or not data.get("contrasena"):
            return jsonify({"error": "usuario y contrasena son requeridos"}), 400
        if not persona_data.get("cedula"):
             return jsonify({"error": "cedula es requerida"}), 400

        # CAMBIO: Usar logic de procesado inteligente de persona
        try:
            persona, created_phones = process_persona(db, persona_data)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        
        # Validar si el usuario (login) ya existe
        if Usuarios.query.filter_by(usuario=data["usuario"], is_deleted=False).first():
             return jsonify({"error": "El nombre de usuario ya está en uso"}), 409

        # Create Usuario linked to the (new or existing) persona
        data["id_personas"] = persona.id
        data["contraseña"] = generate_password_hash(data.pop("contrasena"))
        
        # Verificar si esta persona YA tiene un usuario asociado para evitar doble cuenta
        if Usuarios.query.filter_by(id_personas=persona.id, is_deleted=False).first():
            return jsonify({"error": "Esta persona ya tiene un usuario de sistema asignado."}), 409

        usuario = Usuarios(**data)
        db.session.add(usuario)
        
        db.session.commit()
        
        # Recuperar direccion para serializar
        direccion = Direcciones.query.get(persona.id_direcciones)

        return jsonify({
            "usuario": serialize(usuario),
            "persona": serialize(persona),
            "direccion": serialize(direccion),
            "telefonos": [serialize(t) for t in created_phones] 
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": f"Error de integridad: {e.orig}"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/choferes", methods=["POST"])
@jwt_required()
def create_chofer_combined():
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        persona_data = data.pop("persona", {})
        
        if not data.get("id_empresas_transportes"):
            return jsonify({"error": "id_empresas_transportes es requerido"}), 400
        if not persona_data.get("cedula"):
             return jsonify({"error": "cedula es requerida"}), 400
        
        # CAMBIO: Usar process_persona
        try:
            persona, created_phones = process_persona(db, persona_data)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # Verificar si ya es chofer
        if Choferes.query.filter_by(id_personas=persona.id, is_deleted=False).first():
            return jsonify({"error": "Esta persona ya está registrada como Chofer."}), 409
        
        # Create Chofer
        data["id_personas"] = persona.id
        chofer = Choferes(**data)
        db.session.add(chofer)
        
        db.session.commit()
        
        direccion = Direcciones.query.get(persona.id_direcciones)

        return jsonify({
            "chofer": serialize(chofer),
            "persona": serialize(persona),
            "direccion": serialize(direccion),
            "telefonos": [serialize(t) for t in created_phones] 
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        print(f"Error integrity: {e}")
        return jsonify({"error": "Error creando chofer. Verifique datos."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/empresas_transporte", methods=["POST"])
@jwt_required()
def create_empresa_transporte_combined():
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        direccion_data = data.pop("direccion", {})
        telefonos_data = data.pop("telefonos", [])
        rif_input = data.pop("rif", None)
        
        # Validate required fields
        if not data.get("nombre"):
            return jsonify({"error": "nombre es requerido"}), 400
        if not rif_input:
            return jsonify({"error": "rif es requerido"}), 400
        
        # 1. Handle RIF
        rif_obj = process_rif(db, rif_input)
        if not rif_obj:
            return jsonify({"error": "Formato de RIF inválido (ej: J-12345678)"}), 400
        
        # 2. Create Direccion
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        
        # 3. Create Empresa
        data["id_direcciones"] = direccion.id
        data["id_rif"] = rif_obj.id
        empresa = EmpresasTransporte(**data)
        db.session.add(empresa)
        db.session.flush()
        
        # 4. Handle Phones
        created_phones = process_telefonos(db, telefonos_data)
        for ph in created_phones:
            link = EmpresasTelefonos(id_empresas_transportes=empresa.id, id_telefonos=ph.id)
            db.session.add(link)
        
        db.session.commit()
        
        return jsonify({
            "empresa": serialize(empresa),
            "direccion": serialize(direccion),
            "rif": serialize(rif_obj),
            "telefonos": [serialize(t) for t in created_phones]
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": f"Error de integridad (posible duplicado): {e.orig}"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/granjas", methods=["POST"])
@jwt_required()
def create_granja_combined():
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        ubicacion_data = data.pop("ubicacion", {})
        direccion_data = ubicacion_data.pop("direccion", {}) 
        telefonos_data = data.pop("telefonos", [])
        rif_input = data.pop("rif", None)
        
        # NUEVO: Extraer datos del responsable
        persona_data = data.pop("persona", {})

        # Validate required fields
        if not rif_input:
            return jsonify({"error": "rif es requerido"}), 400
        if not ubicacion_data.get("nombre"):
            return jsonify({"error": "nombre de ubicacion es requerido"}), 400
        
        # Validar datos mínimos del responsable
        if not persona_data.get("cedula") or not persona_data.get("nombre"):
            return jsonify({"error": "Cédula y Nombre del responsable son requeridos"}), 400
        
        # 1. Procesar Persona Responsable (Reutiliza lógica existente)
        # Esto busca por cédula: si existe retorna el obj, si no, lo crea.
        try:
            # Nota: process_persona espera direccion/telefonos dentro de persona_data si se quisieran guardar para la persona
            # En este caso, enviamos datos básicos.
            persona_resp, _ = process_persona(db, persona_data)
        except ValueError as e:
            return jsonify({"error": f"Error en responsable: {str(e)}"}), 400

        # 2. Handle RIF
        rif_obj = process_rif(db, rif_input)
        
        # 3. Create Direccion (De la Granja)
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        
        # 4. Create Ubicacion
        if "tipo" not in ubicacion_data:
            ubicacion_data["tipo"] = "Granja"
        ubicacion_data["id_direcciones"] = direccion.id
        ubicacion = Ubicaciones(**ubicacion_data)
        db.session.add(ubicacion)
        db.session.flush()
        
        # 5. Create Granja
        data["id_ubicaciones"] = ubicacion.id
        data["id_persona_responsable"] = persona_resp.id # Asignamos el ID procesado
        
        if rif_obj:
            data["id_rif"] = rif_obj.id
            
        granja = Granjas(**data)
        db.session.add(granja)
        db.session.flush()

        # 6. Handle Phones (De la Granja)
        created_phones = process_telefonos(db, telefonos_data)
        for ph in created_phones:
            link = GranjasTelefonos(id_granjas=granja.id, id_telefonos=ph.id)
            db.session.add(link)
        
        db.session.commit()
        
        return jsonify({
            "granja": serialize(granja),
            "responsable": serialize(persona_resp), # Retornamos info del responsable
            "ubicacion": serialize(ubicacion),
            "direccion": serialize(direccion),
            "rif": serialize(rif_obj) if rif_obj else None,
            "telefonos": [serialize(t) for t in created_phones]
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": f"Error de integridad: {e.orig}"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/lotes", methods=["POST"])
@jwt_required()
def create_lote_combined():
    from . import db
    data = request.get_json(force=True) or {}
    if not data.get("id_galpones") or not data.get("codigo_lote"):
        return jsonify({"error": "id_galpones y codigo_lote son requeridos"}), 400
    try:
        lote = Lotes(**data)
        db.session.add(lote)
        db.session.commit()
        return jsonify(serialize(lote)), 201
    except IntegrityError:
        return jsonify({"error": "Error creando lote. Verifique que no exista el código."}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# NUEVO ENDPOINT PARA UBICACIONES
@api_bp.route("/combined/ubicaciones", methods=["POST"])
@jwt_required()
def create_ubicacion_combined():
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        direccion_data = data.pop("direccion", {})
        
        # Validations
        if not data.get("nombre"):
             return jsonify({"error": "El nombre de la ubicación es requerido"}), 400
        if not data.get("tipo"):
             return jsonify({"error": "El tipo de ubicación es requerido"}), 400
        
        # 1. Create Direccion
        # Validamos minimos de dirección si es necesario, o dejamos que SQL se queje
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()

        # 2. Create Ubicacion
        data["id_direcciones"] = direccion.id
        ubicacion = Ubicaciones(**data)
        db.session.add(ubicacion)
        
        db.session.commit()
        
        return jsonify({
            "ubicacion": serialize(ubicacion),
            "direccion": serialize(direccion)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": f"Error de integridad: {e.orig}"}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

# ---------- UPDATE (PUT) COMBINED ----------

@api_bp.route("/combined/usuarios/<int:usuario_id>", methods=["PUT"])
@jwt_required()
def update_usuario_combined(usuario_id):
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        usuario = Usuarios.query.get_or_404(usuario_id)
        if "contrasena" in data:
            usuario.contraseña = generate_password_hash(data.pop("contrasena"))
        if "usuario" in data:
            usuario.usuario = data["usuario"]
        if "id_roles" in data:
            usuario.id_roles = data["id_roles"]
            
        persona_data = data.get("persona", {})
        direccion_data = persona_data.get("direccion", {})
        
        persona = Personas.query.get(usuario.id_personas)
        if persona and persona_data:
            for k, v in persona_data.items():
                if k != "direccion" and k != "telefonos" and hasattr(persona, k):
                    setattr(persona, k, v)
        
        if persona and direccion_data:
            direccion = Direcciones.query.get(persona.id_direcciones)
            if direccion:
                for k, v in direccion_data.items():
                    if hasattr(direccion, k):
                        setattr(direccion, k, v)
        
        telefonos_data = persona_data.get("telefonos", [])
        if persona and telefonos_data:
            created_phones = process_telefonos(db, telefonos_data)
            current_links = [l.id_telefonos for l in PersonasTelefonos.query.filter_by(id_personas=persona.id).all()]
            for ph in created_phones:
                if ph.id not in current_links:
                    link = PersonasTelefonos(id_personas=persona.id, id_telefonos=ph.id)
                    db.session.add(link)

        db.session.commit()
        return jsonify(serialize(usuario)), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar: {str(e)}"}), 500

@api_bp.route("/combined/choferes/<int:chofer_id>", methods=["PUT"])
@jwt_required()
def update_chofer_combined(chofer_id):
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        chofer = Choferes.query.get_or_404(chofer_id)
        if "id_empresas_transportes" in data:
            chofer.id_empresas_transportes = data["id_empresas_transportes"]

        persona_data = data.get("persona", {})
        direccion_data = persona_data.get("direccion", {})
        
        persona = Personas.query.get(chofer.id_personas)
        if persona and persona_data:
            for k, v in persona_data.items():
                if k not in ["direccion", "telefonos"] and hasattr(persona, k):
                    setattr(persona, k, v)
                    
            if direccion_data:
                direccion = Direcciones.query.get(persona.id_direcciones)
                if direccion:
                    for k, v in direccion_data.items():
                        if hasattr(direccion, k):
                            setattr(direccion, k, v)

        db.session.commit()
        return jsonify(serialize(chofer)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar: {str(e)}"}), 500

@api_bp.route("/combined/empresas_transporte/<int:id_>", methods=["PUT"])
@jwt_required()
def update_empresa_combined(id_):
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        empresa = EmpresasTransporte.query.get_or_404(id_)
        if "nombre" in data: empresa.nombre = data["nombre"]
        
        rif_input = data.get("rif")
        if rif_input:
            rif_obj = process_rif(db, rif_input)
            if rif_obj:
                empresa.id_rif = rif_obj.id

        direccion_data = data.get("direccion", {})
        if direccion_data and empresa.id_direcciones:
            direccion = Direcciones.query.get(empresa.id_direcciones)
            if direccion:
                for k, v in direccion_data.items():
                    if hasattr(direccion, k):
                        setattr(direccion, k, v)
        
        db.session.commit()
        return jsonify(serialize(empresa)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/combined/granjas/<int:id_>", methods=["PUT"])
@jwt_required()
def update_granja_combined(id_):
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        granja = Granjas.query.get_or_404(id_)
        
        if "id_persona_responsable" in data:
            granja.id_persona_responsable = data["id_persona_responsable"]
            
        ubicacion_data = data.get("ubicacion", {})
        direccion_data = ubicacion_data.get("direccion", {})
        
        if granja.id_ubicaciones:
            ubicacion = Ubicaciones.query.get(granja.id_ubicaciones)
            if ubicacion and ubicacion_data:
                if "nombre" in ubicacion_data: ubicacion.nombre = ubicacion_data["nombre"]
                if "tipo" in ubicacion_data: ubicacion.tipo = ubicacion_data["tipo"]
                
                if direccion_data and ubicacion.id_direcciones:
                    direccion = Direcciones.query.get(ubicacion.id_direcciones)
                    if direccion:
                         for k, v in direccion_data.items():
                            if hasattr(direccion, k):
                                setattr(direccion, k, v)
        
        rif_input = data.get("rif")
        if rif_input:
            rif_obj = process_rif(db, rif_input)
            if rif_obj:
                granja.id_rif = rif_obj.id

        db.session.commit()
        return jsonify(serialize(granja)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ---------- GENERIC CRUD ----------
@api_bp.route("/<resource>", methods=["GET"])
@jwt_required()
def list_resource(resource):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = max(1, min(per_page, 100))

    query = model.query.order_by(model.id)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    # MODIFICADO: Pasamos resource a serialize
    items = [serialize(x, resource) for x in pagination.items]

    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages
    })

@api_bp.route("/<resource>/all", methods=["GET"])
@jwt_required()
def list_resource_all(resource):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    items = model.query.order_by(model.id).all()
    # MODIFICADO: Pasamos resource a serialize
    return jsonify([serialize(x, resource) for x in items])

@api_bp.route("/bulk", methods=["POST"])
@jwt_required()
def bulk_resources():
    data = request.get_json(force=True) or {}
    resources = data.get("resources", [])
    page = data.get("page", 1)
    per_page = data.get("per_page", 20)
    per_page = max(1, min(int(per_page), 100))

    result = {}
    for resource in resources:
        model = MODEL_MAP.get(resource)
        if not model:
            result[resource] = {"error": "Recurso no encontrado"}
            continue
        query = model.query.order_by(model.id)
        pagination = query.paginate(page=int(page), per_page=per_page, error_out=False)
        # MODIFICADO: Pasamos resource a serialize
        items = [serialize(x, resource) for x in pagination.items]
        result[resource] = {
            "items": items,
            "page": int(page),
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages
        }
    return jsonify(result)

@api_bp.route("/<resource>/<string:id_>", methods=["GET"])
@jwt_required()
def get_resource(resource, id_):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    
    if resource == "usuarios" and id_ == "me":
        id_ = get_jwt_identity()

    if not str(id_).isdigit():
        return jsonify({"error": "ID inválido"}), 400

    obj = model.query.get_or_404(int(id_))
    # MODIFICADO: Pasamos resource a serialize
    return jsonify(serialize(obj, resource))

@api_bp.route("/<resource>", methods=["POST"])
@jwt_required()
def create_resource(resource):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    data = request.get_json(force=True) or {}
    data.pop("created_at", None)
    data.pop("id", None) 

    if resource == "usuarios" and "contrasena" in data:
        data["contraseña"] = generate_password_hash(data.pop("contrasena"))

    temp_telefono_id = None
    if resource == "personas":
        temp_telefono_id = data.pop("id_telefono", None)
        data.pop("telefono_numero", None)
        data.pop("telefono_tipo", None)

    if resource == "productos":
        data["codigo"] = f"PRD-{uuid.uuid4().hex[:6]}"

    ok, err = validate_payload(model, data, partial=False)
    if not ok:
        print(f"[{resource}] Error de validación: {err}") 
        return jsonify({"error": err}), 400
    
    try:
        service = CRUDService(model)
        obj = service.create(data)

        # ... (bloques personas y productos) ...
        # ...existing code...

        # MODIFICADO: Retornar data expandida (útil para actualizar UI sin recargar)
        return jsonify(serialize(obj, resource)), 201

    except IntegrityError as e:
        from . import db
        db.session.rollback() 
        print(f"IntegrityError en {resource}: {e}") 
        return jsonify({"error": "El registro ya existe o falta un campo obligatorio."}), 409
    
    except SQLAlchemyError as e:
        from . import db
        db.session.rollback()
        print(f"SQLAlchemyError en {resource}: {e}")
        return jsonify({"error": f"Error de base de datos: {str(e)}"}), 500

    except Exception as e:
        import traceback
        traceback.print_exc() 
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/<resource>/<int:id_>", methods=["PUT"])
@jwt_required()
def update_resource(resource, id_):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    data = request.get_json(force=True) or {}

    data.pop("peso_neto", None)

    if resource == "usuarios" and "contrasena" in data:
        pwd = data.pop("contrasena")
        if pwd:
            data["contraseña"] = generate_password_hash(pwd)
    
    if resource == "personas":
        data.pop("id_telefono", None)

    ok, err = validate_payload(model, data, partial=True)
    if not ok:
        return jsonify({"error": err}), 400
    service = CRUDService(model)
    obj = service.update(id_, data)
    # MODIFICADO
    return jsonify(serialize(obj, resource))

@api_bp.route("/<resource>/<int:id_>", methods=["DELETE"])
@jwt_required()
def delete_resource(resource, id_):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404

    obj = model.query.get_or_404(id_)
    obj.is_deleted = True

    from . import db
    db.session.commit()

    # MODIFICADO
    return jsonify(serialize(obj, resource))

# ---------- SERIAL & TICKETS ----------

@api_bp.route("/serial/list", methods=["GET"])
@jwt_required()
def list_serial_ports():
    ports = serial.tools.list_ports.comports()
    result = []
    for port in ports:
        result.append({
            "device": port.device,       
            "name": port.name,
            "description": port.description,
            "hwid": port.hwid
        })
    return jsonify(result)

@api_bp.route("/serial/read", methods=["GET"])
@jwt_required()
def read_serial():
    SERIAL_PORT = 'COM2' 
    BAUD_RATE = 9600
    TIMEOUT = 5 
    try:
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=TIMEOUT) as ser:
            ser.reset_input_buffer() 
            data_bytes = ser.readline()
            if data_bytes:
                data_str = data_bytes.decode('utf-8', errors='ignore').strip()
                return jsonify({"data": data_str, "status": "success"})
            else:
                return jsonify({"error": "Tiempo de espera agotado, no se recibieron datos", "status": "timeout"}), 408
    except serial.SerialException as e:
        return jsonify({"error": f"No se pudo acceder al puerto {SERIAL_PORT}. Verifique conexión.", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Error inesperado leyendo puerto serial", "details": str(e)}), 500

@api_bp.route("/tickets_pesaje/registrar_peso", methods=["POST"])
@jwt_required()
def registrar_peso_ticket():
    from . import db
    from sqlalchemy import text
    import traceback
    try:
        data = request.get_json(force=True) or {}
        id = data.get("id")
        peso = data.get("peso")
        id_usuario = get_jwt_identity()  # ID del usuario que realiza el segundo pesaje

        if not id or peso is None:
            return jsonify({"error": "Datos requeridos: id, peso"}), 400

        ticket = TicketPesaje.query.filter_by(id=id, is_deleted=False).first()
        if not ticket:
            return jsonify({"error": "Ticket no encontrado"}), 404

        # Determinar tipo de peso según el tipo de ticket
        if ticket.tipo.lower() == "entrada":
            tipo_peso = "tara"
        elif ticket.tipo.lower() == "salida":
            tipo_peso = "bruto"
        else:
            return jsonify({"error": "Tipo de ticket desconocido"}), 400

        peso_decimal = Decimal(str(peso))

        # Actualiza el campo correspondiente
        if tipo_peso == "bruto":
            db.session.execute(
                text("UPDATE Ticket_pesaje SET peso_bruto = :peso WHERE id = :id AND is_deleted = 0"),
                {"peso": peso_decimal, "id": id}
            )
        elif tipo_peso == "tara":
            db.session.execute(
                text("UPDATE Ticket_pesaje SET peso_tara = :peso WHERE id = :id AND is_deleted = 0"),
                {"peso": peso_decimal, "id": id}
            )

        # Consulta los pesos actualizados directamente de la base de datos
        result = db.session.execute(
            text("SELECT peso_bruto, peso_tara FROM Ticket_pesaje WHERE id = :id AND is_deleted = 0"),
            {"id": id}
        ).fetchone()

        peso_bruto = result.peso_bruto
        peso_tara = result.peso_tara

        if peso_bruto is not None and peso_tara is not None:
            if ticket.tipo.lower() in ("entrada", "salida"):
                peso_neto = abs(peso_bruto - peso_tara)
            else:
                peso_neto = None
            db.session.execute(
                text("""
                    UPDATE Ticket_pesaje 
                    SET peso_neto = :neto,
                        id_usuarios_segundo_peso = :id_usuario,
                        fecha_segundo_peso = :fecha
                    WHERE id = :id AND is_deleted = 0
                """),
                {
                    "neto": peso_neto,
                    "id_usuario": id_usuario,
                    "fecha": datetime.datetime.now(),
                    "id": id
                }
            )
        else:
            db.session.execute(
                text("UPDATE Ticket_pesaje SET estado = 'En Proceso' WHERE id = :id AND is_deleted = 0"),
                {"id": id}
            )

        if ticket.id_producto != 1:
            db.session.execute(
                text("UPDATE Ticket_pesaje SET estado = 'Finalizado' WHERE id = :id AND is_deleted = 0"),
                {"id": id}
            )

        db.session.commit()
        ticket = TicketPesaje.query.filter_by(id=id, is_deleted=False).first()
        return jsonify(serialize(ticket))
    except Exception as e:
        db.session.rollback()
        print("ERROR EN registrar_peso_ticket:", e)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/tickets_pesaje/<int:ticket_id>/imprimir", methods=["POST"])
@jwt_required()
def imprimir_ticket(ticket_id):
    ticket = TicketPesaje.query.get_or_404(ticket_id)
    asignacion = Asignaciones.query.get(ticket.id_asignaciones) if ticket.id_asignaciones else None
    placa = "N/A"
    nombre_chofer = "N/A"
    if asignacion:
        # Vehículo
        vehiculo = Vehiculos.query.get(asignacion.id_vehiculos) if asignacion.id_vehiculos else None
        if vehiculo:
            placa = vehiculo.placa

        # Chofer
        chofer = Choferes.query.get(asignacion.id_chofer) if asignacion.id_chofer else None
        if chofer:
            persona = Personas.query.get(chofer.id_personas) if chofer.id_personas else None
            if persona:
                nombre_chofer = f"{persona.nombre} {persona.apellido} - {persona.tipo_cedula}{persona.cedula}"


    producto = Productos.query.get(ticket.id_producto)
    nombre_producto = producto.nombre if producto else "N/A"
    
    fecha_str = ticket.created_at.strftime("%d/%m/%Y") if ticket.created_at else datetime.datetime.now().strftime("%d/%m/%Y")
    hora_str = datetime.datetime.now().strftime("%I:%M:%S %p")
    
    p_tara = float(ticket.peso_tara) if ticket.peso_tara is not None else 0.0
    p_bruto = float(ticket.peso_bruto) if ticket.peso_bruto is not None else 0.0

    if p_bruto > 0 and p_tara > 0:
        p_neto = float(ticket.peso_neto) if ticket.peso_neto is not None else abs(p_bruto - p_tara)
    else:
        p_neto = 0.0

    return jsonify({
        "nro_ticket": ticket.nro_ticket,
        "empresa": "AVICOLA LA ROSITA, S.A.",
        "sucursal": "MARA I",
        "tipo_proceso": ticket.tipo.upper() or 'ENTRADA/SALIDA',
        "fecha": fecha_str,
        "hora": hora_str,
        "placa": placa,
        "chofer": nombre_chofer,
        "producto": nombre_producto,
        "peso_tara": p_tara,
        "peso_bruto": p_bruto,
        "peso_neto": p_neto
    })

@api_bp.route("/tickets_pesaje/<int:id>/reimpresiones", methods=["GET"])
def get_reimpresiones(id):
    ticket = TicketPesaje.query.get_or_404(id)
    return jsonify({"reimpresiones": ticket.reimpresiones})

@api_bp.route("/tickets_pesaje", methods=["POST"])
@jwt_required()
def create_ticket_pesaje():
    from .models import TicketPesaje, Asignaciones, Ubicaciones
    from . import db
    import uuid
    import datetime

    data = request.get_json(force=True) or {}

    data.pop("nro_ticket", None)
    data.pop("peso_neto", None)

    # --- Asignación ---
    id_asignaciones = data.get("id_asignaciones")
    id_vehiculo = data.pop("id_vehiculo", None)
    id_chofer = data.pop("id_chofer", None)
    if not id_asignaciones and id_vehiculo and id_chofer:
        # Buscar asignación activa
        asignacion = Asignaciones.query.filter_by(
            id_vehiculos=id_vehiculo,
            id_chofer=id_chofer,
            is_deleted=False
        ).first()
        if not asignacion:
            now = datetime.datetime.now()
            asignacion = Asignaciones(
                id_vehiculos=id_vehiculo,
                id_chofer=id_chofer,
                fecha=now.date(),
                hora=now.time()
            )
            db.session.add(asignacion)
            db.session.flush()
        data["id_asignaciones"] = asignacion.id

    # --- Ubicación Origen ---
    id_origen = data.get("id_origen")
    origen_data = data.pop("origen_data", None)
    if not id_origen and origen_data:
        # origen_data debe ser un dict con al menos nombre y tipo
        direccion_data = origen_data.pop("direccion", {})
        from .models import Direcciones
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        origen = Ubicaciones(
            id_direcciones=direccion.id,
            **origen_data
        )
        db.session.add(origen)
        db.session.flush()
        data["id_origen"] = origen.id

    # --- Ubicación Destino ---
    id_destino = data.get("id_destino")
    destino_data = data.pop("destino_data", None)
    if not id_destino and destino_data:
        direccion_data = destino_data.pop("direccion", {})
        from .models import Direcciones
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        destino = Ubicaciones(
            id_direcciones=direccion.id,
            **destino_data
        )
        db.session.add(destino)
        db.session.flush()
        data["id_destino"] = destino.id

    print("Received data for new ticket:", data)
    ok, err = validate_payload(TicketPesaje, data, partial=False)
    if not ok:
        return jsonify({"error": err}), 400

    temp_code = f"PEND-{uuid.uuid4().hex[:8]}"
    ticket = TicketPesaje(nro_ticket=temp_code, **data)
    db.session.add(ticket)
    db.session.flush()  # Asigna el id sin cerrar la transacción

    ticket_id = ticket.id

    db.session.commit()  # Guarda el registro con el nro_ticket temporal

    # Ahora actualiza el nro_ticket real usando una consulta directa
    real_code = f"TKT-{ticket_id:06d}"
    db.session.query(TicketPesaje).filter_by(id=ticket_id).update({"nro_ticket": real_code})
    db.session.commit()

    # Recupera el ticket actualizado para serializarlo
    ticket = TicketPesaje.query.get(ticket_id)
    return jsonify(serialize(ticket)), 201

@api_bp.route("/tickets_pesaje/<int:ticket_id>/nota_entrega", methods=["POST"])
@jwt_required()
def registrar_nota_entrega(ticket_id):
    from . import db
    from sqlalchemy import text
    from .models import Lotes, Galpones, Granjas, Ubicaciones, Direcciones
    import datetime
    data = request.get_json(force=True) or {}
    print(f"Registrar nota entrega para ticket {ticket_id} con data: {data}")
    # Validar ticket
    ticket = TicketPesaje.query.get(ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket no encontrado"}), 404

    # --- DATOS DEL FORMULARIO ---
    conteos_data = data.get("conteos", {})
    origen_data = data.get("origen", {})
    # Tiempos del formulario (solo los de descarga y salida granja)
    hora_salida_granja = data.get("hora_salida_granja")
    hora_inicio_descarga = data.get("hora_inicio_descarga")
    hora_fin_descarga = data.get("hora_fin_descarga")

    # --- CALCULOS DE TIEMPOS ---
    # Hora llegada romana = fecha_primer_peso
    hora_llegada_romana = ticket.fecha_primer_peso
    # Hora salida romana = fecha_segundo_peso
    hora_salida_romana = ticket.fecha_segundo_peso

    # Convertir strings a datetime si vienen del frontend
    def parse_dt(val):
        if isinstance(val, str):
            try:
                return datetime.datetime.fromisoformat(val)
            except Exception:
                return None
        return val

    hora_salida_granja = parse_dt(hora_salida_granja)
    hora_inicio_descarga = parse_dt(hora_inicio_descarga)
    hora_fin_descarga = parse_dt(hora_fin_descarga)

    # Calcular tiempos en minutos
    tiempo_transito = None
    tiempo_espera = None
    tiempo_operacion = None
    if hora_salida_granja and hora_llegada_romana:
        tiempo_transito = int((hora_llegada_romana - hora_salida_granja).total_seconds() // 60)
    if hora_llegada_romana and hora_inicio_descarga:
        tiempo_espera = int((hora_inicio_descarga - hora_llegada_romana).total_seconds() // 60)
    if hora_inicio_descarga and hora_fin_descarga:
        tiempo_operacion = int((hora_fin_descarga - hora_inicio_descarga).total_seconds() // 60)

    # --- CALCULO DE PESO PROMEDIO JAULAS ---
    peso_promedio_jaulas = None
    if ticket.peso_neto and conteos_data.get("numero_de_jaulas"):
        try:
            peso_promedio_jaulas = float(ticket.peso_neto) / float(conteos_data["numero_de_jaulas"])
        except Exception:
            peso_promedio_jaulas = None

    # --- CALCULO DE ESTADISTICAS ---
    estadisticas_data = {}
    aves_recibidas = conteos_data.get("aves_recibidas")
    aves_faltantes = conteos_data.get("aves_faltantes")
    aves_aho = conteos_data.get("aves_aho")
    aves_guia = conteos_data.get("aves_guia")

    porcentaje_aves_faltantes = None
    porcentaje_aves_ahogadas = None
    peso_promedio_aves = None

    if aves_recibidas and aves_faltantes is not None and aves_guia:
        try:
            porcentaje_aves_faltantes = (float(aves_faltantes) / float(aves_guia)) * 100 if float(aves_guia) > 0 else 0
        except Exception:
            porcentaje_aves_faltantes = None
    if aves_recibidas and aves_aho is not None and aves_guia:
        try:
            porcentaje_aves_ahogadas = (float(aves_aho) / float(aves_guia)) * 100 if float(aves_guia) > 0 else 0
        except Exception:
            porcentaje_aves_ahogadas = None
    if aves_recibidas and ticket.peso_neto:
        try:
            peso_promedio_aves = float(ticket.peso_neto) / float(aves_recibidas) if float(aves_recibidas) > 0 else 0
        except Exception:
            peso_promedio_aves = None

    estadisticas_data = {
        "porcentaje_aves_faltantes": porcentaje_aves_faltantes,
        "porcentaje_aves_ahogadas": porcentaje_aves_ahogadas,
        "peso_promedio_aves": peso_promedio_aves,
    }

    # --- GUARDAR EN BASE DE DATOS ---
    # Viajes_tiempos
    tiempos = ViajesTiempos(
        id_ticket=ticket_id,
        hora_salida_granja=hora_salida_granja,
        hora_llegada_romana=hora_llegada_romana,
        hora_inicio_descarga=hora_inicio_descarga,
        hora_fin_descarga=hora_fin_descarga,
        hora_salida_romana=hora_salida_romana,
        tiempo_transito=tiempo_transito,
        tiempo_espera=tiempo_espera,
        tiempo_operacion=tiempo_operacion,
    )
    db.session.add(tiempos)

    # Viajes_conteos
    conteos = ViajesConteos(
        id_ticket=ticket_id,
        aves_guia=conteos_data.get("aves_guia"),
        aves_recibidas=aves_recibidas,
        aves_faltantes=aves_faltantes,
        aves_aho=aves_aho,
        numero_de_jaulas=conteos_data.get("numero_de_jaulas"),
        peso_promedio_jaulas=peso_promedio_jaulas,
        aves_por_jaula=conteos_data.get("aves_por_jaula"),
    )
    db.session.add(conteos)

    id_lote = origen_data.get("id_lote")
    numero_de_orden = origen_data.get("numero_de_orden")
    lote_data = origen_data.get("lote", {})
    galpon_data = lote_data.get("galpon", {}) if lote_data else {}
    granja_data = galpon_data.get("granja", {}) if galpon_data else {}
    ubicacion_data = granja_data.get("ubicacion", {}) if granja_data else {}
    direccion_data = ubicacion_data.get("direccion", {}) if ubicacion_data else {}

    # 1. Dirección
    id_direccion = ubicacion_data.get("id_direcciones")
    if not id_direccion and direccion_data:
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        id_direccion = direccion.id
    elif id_direccion:
        direccion = Direcciones.query.get(id_direccion)

    # 2. Ubicación
    id_ubicacion = granja_data.get("id_ubicaciones")
    if not id_ubicacion and ubicacion_data:
        ubicacion_data["id_direcciones"] = id_direccion
        ubicacion = Ubicaciones(**ubicacion_data)
        db.session.add(ubicacion)
        db.session.flush()
        id_ubicacion = ubicacion.id
    elif id_ubicacion:
        ubicacion = Ubicaciones.query.get(id_ubicacion)

    # 3. Granja
    id_granja = galpon_data.get("id_granja")
    if not id_granja and granja_data:
        granja_data["id_ubicaciones"] = id_ubicacion
        granja = Granjas(**granja_data)
        db.session.add(granja)
        db.session.flush()
        id_granja = granja.id
    elif id_granja:
        granja = Granjas.query.get(id_granja)

    # 4. Galpón
    id_galpon = lote_data.get("id_galpones")
    if not id_galpon and galpon_data:
        galpon_data["id_granja"] = id_granja
        galpon = Galpones(**galpon_data)
        db.session.add(galpon)
        db.session.flush()
        id_galpon = galpon.id
    elif id_galpon:
        galpon = Galpones.query.get(id_galpon)

    # 5. Lote
    if not id_lote and lote_data:
        lote_data["id_galpones"] = id_galpon
        lote = Lotes(**lote_data)
        db.session.add(lote)
        db.session.flush()
        id_lote = lote.id
    elif id_lote:
        lote = Lotes.query.get(id_lote)

    # --- FIN CREACIÓN JERÁRQUICA ---

    # Ahora crea ViajesOrigen con el id_lote correcto
    if id_lote:
        origen = ViajesOrigen(
            id_ticket=ticket_id,
            id_lote=id_lote,
            numero_de_orden=numero_de_orden,
        )
        db.session.add(origen)

    # Estadisticas
    estadisticas = Estadisticas(
        id_ticket=ticket_id,
        porcentaje_aves_faltantes=estadisticas_data["porcentaje_aves_faltantes"],
        porcentaje_aves_ahogadas=estadisticas_data["porcentaje_aves_ahogadas"],
        peso_promedio_aves=estadisticas_data["peso_promedio_aves"],
    )
    db.session.add(estadisticas)

    # Cambia el estado del ticket a Finalizado
    db.session.execute(
        text("UPDATE Ticket_pesaje SET estado = 'Finalizado' WHERE id = :id"),
        {"id": ticket_id}
    )

    db.session.commit()
    return jsonify({"status": "ok"})

@api_bp.route("/tickets_pesaje/<int:ticket_id>/nota_entrega", methods=["GET"])
@jwt_required()
def obtener_nota_entrega(ticket_id):
    tiempos = ViajesTiempos.query.filter_by(id_ticket=ticket_id).first()
    conteos = ViajesConteos.query.filter_by(id_ticket=ticket_id).first()
    origen = ViajesOrigen.query.filter_by(id_ticket=ticket_id).first()
    estadisticas = Estadisticas.query.filter_by(id_ticket=ticket_id).first()

    def serialize(obj, name=None):
        if not obj: return None
        return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

    return jsonify({
        "tiempos": serialize(tiempos),
        "conteos": serialize(conteos),
        "origen": serialize(origen),
        "estadisticas": serialize(estadisticas),
    })

@api_bp.route("/tickets_pesaje/<int:ticket_id>/reimprimir", methods=["POST"])
@jwt_required()
def reimprimir_ticket(ticket_id):
    from . import db
    from sqlalchemy import text
    try:
        ticket = TicketPesaje.query.get_or_404(ticket_id)
        db.session.execute(
            text("UPDATE Ticket_pesaje SET reimpresiones = reimpresiones + 1 WHERE id = :id"),
            {"id": ticket_id}
        )
        db.session.commit()
        ticket.reimpresiones += 1
        return jsonify({"status": "ok", "reimpresiones": ticket.reimpresiones})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@api_bp.route("/reporte_transporte_aves_sql", methods=["GET"])
@jwt_required()
def reporte_transporte_aves_sql():
    from . import db  # Asegúrate de que db esté bien inicializado
    from sqlalchemy import text

    fecha_inicio = request.args.get("fecha_inicio")
    fecha_fin = request.args.get("fecha_fin")
    fecha = request.args.get("fecha")

    # 1. Construcción del SQL con alias exactos
    sql = """
    SELECT
        tp.nro_ticket,
        v.placa,
        CONCAT(p.nombre, ' ', p.apellido) AS chofer,
        vt.hora_salida_granja,
        vt.hora_llegada_romana,
        vt.tiempo_transito AS tiempo_recorrido,
        vt.hora_inicio_descarga AS hora_inicio_proceso,
        vt.tiempo_espera,
        u.nombre AS granja,
        vc.aves_recibidas AS aves_contadas,
        vc.aves_faltantes,
        e.porcentaje_aves_faltantes,
        tp.peso_neto AS kilos_netos,
        e.peso_promedio_aves AS peso_promedio,
        vc.aves_aho AS aves_ahogadas,
        e.porcentaje_aves_ahogadas,
        vc.numero_de_jaulas,
        vc.aves_por_jaula,
        g.nro_galpon AS numero_galpon,
        l.fecha_alojamiento,
        DATEDIFF(day, l.fecha_alojamiento, vt.hora_salida_granja) AS edad_aves
    FROM Ticket_pesaje tp
    LEFT JOIN Asignaciones a ON tp.id_asignaciones = a.id
    LEFT JOIN Vehiculos v ON a.id_vehiculos = v.id
    LEFT JOIN Choferes c ON a.id_chofer = c.id
    LEFT JOIN Personas p ON c.id_personas = p.id
    LEFT JOIN Viajes_tiempos vt ON vt.id_ticket = tp.id
    LEFT JOIN Viajes_conteos vc ON vc.id_ticket = tp.id
    LEFT JOIN Viajes_origen vo ON vo.id_ticket = tp.id
    LEFT JOIN Lotes l ON vo.id_lote = l.id
    LEFT JOIN Galpones g ON l.id_galpones = g.id
    LEFT JOIN Granjas gr ON g.id_granja = gr.id
    LEFT JOIN Ubicaciones u ON gr.id_ubicaciones = u.id
    LEFT JOIN Estadisticas e ON e.id_ticket = tp.id
    WHERE tp.estado = 'Finalizado'
    """
    
    params = {}
    # 2. Lógica de filtrado corregida
# Filtro para una sola fecha (Ignora la hora para encontrar todos los del día)
    if fecha:
        sql += " AND CAST(vt.hora_llegada_romana AS DATE) = :fecha"
        params["fecha"] = fecha
        
    # Filtro para rango (Asegura incluir desde el inicio del primer día hasta el final del último)
    elif fecha_inicio and fecha_fin:
        sql += """ 
            AND vt.hora_salida_granja >= :fecha_inicio 
            AND vt.hora_salida_granja <= :fecha_fin_full 
        """
        params["fecha_inicio"] = f"{fecha_inicio} 00:00:00"
        params["fecha_fin_full"] = f"{fecha_fin} 23:59:59"

    try:
        result = db.session.execute(text(sql), params)
        
        # 3. Conversión segura a Diccionario
        data = []
        for row in result:
            # Usamos row._mapping para acceder por nombre de forma segura en SQLAlchemy 1.4/2.0
            r = row._mapping 
            
            data.append({
                "nro_ticket": r["nro_ticket"],
                "placa": r["placa"],
                "chofer": r["chofer"],
                "hora_salida_granja": str(r["hora_salida_granja"]) if r["hora_salida_granja"] else None,
                "hora_llegada_romana": str(r["hora_llegada_romana"]) if r["hora_llegada_romana"] else None,
                "tiempo_recorrido": str(r["tiempo_recorrido"]) if r["tiempo_recorrido"] else None,
                "hora_inicio_proceso": str(r["hora_inicio_proceso"]) if r["hora_inicio_proceso"] else None,
                "tiempo_espera": str(r["tiempo_espera"]) if r["tiempo_espera"] else None,
                "granja": r["granja"],
                "aves_contadas": r["aves_contadas"],
                "aves_faltantes": r["aves_faltantes"],
                "porcentaje_aves_faltantes": float(r["porcentaje_aves_faltantes"]) if r["porcentaje_aves_faltantes"] else 0,
                "kilos_netos": float(r["kilos_netos"]) if r["kilos_netos"] else 0,
                "peso_promedio": float(r["peso_promedio"]) if r["peso_promedio"] else 0,
                "aves_ahogadas": r["aves_ahogadas"],
                "porcentaje_aves_ahogadas": float(r["porcentaje_aves_ahogadas"]) if r["porcentaje_aves_ahogadas"] else 0,
                "numero_jaulas": r["numero_de_jaulas"], # Corregido nombre según el SQL
                "aves_por_jaula": r["aves_por_jaula"],
                "numero_galpon": r["numero_galpon"],
                "fecha_alojamiento": str(r["fecha_alojamiento"]) if r["fecha_alojamiento"] else None,
                "edad_aves": r["edad_aves"]
            })
            
        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
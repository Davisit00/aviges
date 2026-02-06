from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError # <--- AGREGAR ESTO
import serial
import serial.tools.list_ports 
import datetime # Agregado para formatear fechas

from .models import (
    Usuarios, Roles, EmpresasTransporte, Granjas, Productos, Galpones,
    Vehiculos, Choferes, TicketPesaje, Direcciones, Personas, Telefonos,
    Ubicaciones, Asignaciones, Lotes, ViajesTiempos, ViajesConteos, 
    ViajesOrigen, Estadisticas
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

def serialize(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

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
    print("contraseña hash:", generate_password_hash("123456"))

    if not user or not check_password_hash(user.contraseña, contrasena):
        return jsonify({"error": "Credenciales inválidas"}), 401

    # Incluimos el id_roles en los claims del token
    token = create_access_token(identity=str(user.id), additional_claims={"id_roles": user.id_roles})
    return jsonify({"access_token": token})

@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    if "contrasena" not in data:
        return jsonify({"error": "contrasena es requerida"}), 400

    # CAMBIO: Usar la clave correcta del modelo (contraseña)
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
# These endpoints handle creating normalized entities together

@api_bp.route("/combined/usuarios", methods=["POST"])
@jwt_required()
def create_usuario_combined():
    """
    Create a Usuario along with its Persona and Direccion in a single transaction.
    Expected payload:
    {
        "usuario": "admin",
        "contrasena": "123456",
        "id_roles": 1,
        "persona": {
            "nombre": "Admin",
            "apellido": "Principal",
            "cedula": "12345678",
            "direccion": {
                "pais": "Venezuela",
                "estado": "Zulia",
                "municipio": "Maracaibo",
                "sector": "Centro",
                "descripcion": "Av. Principal"
            }
        }
    }
    """
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        persona_data = data.pop("persona", {})
        direccion_data = persona_data.pop("direccion", {})
        
        # Validate required fields
        if not data.get("usuario") or not data.get("contrasena"):
            return jsonify({"error": "usuario y contrasena son requeridos"}), 400
        if not persona_data.get("nombre") or not persona_data.get("apellido") or not persona_data.get("cedula"):
            return jsonify({"error": "nombre, apellido y cedula de la persona son requeridos"}), 400
        if not direccion_data.get("pais") or not direccion_data.get("estado"):
            return jsonify({"error": "pais y estado de la direccion son requeridos"}), 400
        
        # Create Direccion
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()  # Get the ID without committing
        
        # Create Persona
        persona_data["id_direcciones"] = direccion.id
        persona = Personas(**persona_data)
        db.session.add(persona)
        db.session.flush()
        
        # Create Usuario
        data["id_personas"] = persona.id
        data["contraseña"] = generate_password_hash(data.pop("contrasena"))
        usuario = Usuarios(**data)
        db.session.add(usuario)
        
        db.session.commit()
        
        return jsonify({
            "usuario": serialize(usuario),
            "persona": serialize(persona),
            "direccion": serialize(direccion)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "El registro ya existe. Verifique campos únicos (Usuario, Cédula, etc)."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/choferes", methods=["POST"])
@jwt_required()
def create_chofer_combined():
    """
    Create a Chofer along with its Persona and Direccion in a single transaction.
    Expected payload:
    {
        "id_empresas_transportes": 1,
        "persona": {
            "nombre": "Juan",
            "apellido": "Perez",
            "cedula": "12345678",
            "direccion": {
                "pais": "Venezuela",
                "estado": "Zulia",
                "municipio": "Maracaibo",
                "sector": "Centro",
                "descripcion": "Calle 1"
            }
        }
    }
    """
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        persona_data = data.pop("persona", {})
        direccion_data = persona_data.pop("direccion", {})
        
        # Validate required fields
        if not data.get("id_empresas_transportes"):
            return jsonify({"error": "id_empresas_transportes es requerido"}), 400
        if not persona_data.get("nombre") or not persona_data.get("apellido") or not persona_data.get("cedula"):
            return jsonify({"error": "nombre, apellido y cedula de la persona son requeridos"}), 400
        
        # Create Direccion
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        
        # Create Persona
        persona_data["id_direcciones"] = direccion.id
        persona = Personas(**persona_data)
        db.session.add(persona)
        db.session.flush()
        
        # Create Chofer
        data["id_personas"] = persona.id
        chofer = Choferes(**data)
        db.session.add(chofer)
        
        db.session.commit()
        
        return jsonify({
            "chofer": serialize(chofer),
            "persona": serialize(persona),
            "direccion": serialize(direccion)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "El registro ya existe. Verifique campos únicos (Cédula, etc)."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/empresas_transporte", methods=["POST"])
@jwt_required()
def create_empresa_transporte_combined():
    """
    Create an Empresa de Transporte along with its Direccion.
    Expected payload:
    {
        "nombre": "Transportes ABC",
        "rif": "J-12345678-9",
        "direccion": {
            "pais": "Venezuela",
            "estado": "Zulia",
            "municipio": "Maracaibo",
            "sector": "Industrial",
            "descripcion": "Zona Industrial"
        }
    }
    """
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        direccion_data = data.pop("direccion", {})
        
        # Validate required fields
        if not data.get("nombre") or not data.get("rif"):
            return jsonify({"error": "nombre y rif son requeridos"}), 400
        
        # Create Direccion
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        
        # Create Empresa
        data["id_direcciones"] = direccion.id
        empresa = EmpresasTransporte(**data)
        db.session.add(empresa)
        
        db.session.commit()
        
        return jsonify({
            "empresa": serialize(empresa),
            "direccion": serialize(direccion)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "El registro ya existe. Verifique campos únicos (RIF, etc)."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/combined/granjas", methods=["POST"])
@jwt_required()
def create_granja_combined():
    """
    Create a Granja along with its Ubicacion and Direccion.
    Expected payload:
    {
        "rif": "J-98765432-1",
        "ubicacion": {
            "nombre": "Granja La Esperanza",
            "tipo": "Granja",
            "direccion": {
                "pais": "Venezuela",
                "estado": "Zulia",
                "municipio": "Maracaibo",
                "sector": "Rural",
                "descripcion": "Km 15 via Perija"
            }
        }
    }
    """
    from . import db
    data = request.get_json(force=True) or {}
    
    try:
        # Extract nested data
        ubicacion_data = data.pop("ubicacion", {})
        direccion_data = ubicacion_data.pop("direccion", {})
        
        # Validate required fields
        if not data.get("rif"):
            return jsonify({"error": "rif es requerido"}), 400
        if not ubicacion_data.get("nombre") or not ubicacion_data.get("tipo"):
            return jsonify({"error": "nombre y tipo de ubicacion son requeridos"}), 400
        
        # Create Direccion
        direccion = Direcciones(**direccion_data)
        db.session.add(direccion)
        db.session.flush()
        
        # Create Ubicacion
        ubicacion_data["id_direcciones"] = direccion.id
        ubicacion = Ubicaciones(**ubicacion_data)
        db.session.add(ubicacion)
        db.session.flush()
        
        # Create Granja
        data["id_ubicaciones"] = ubicacion.id
        granja = Granjas(**data)
        db.session.add(granja)
        
        db.session.commit()
        
        return jsonify({
            "granja": serialize(granja),
            "ubicacion": serialize(ubicacion),
            "direccion": serialize(direccion)
        }), 201
        
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({"error": "El registro ya existe. Verifique campos únicos (RIF, etc)."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

# Combined GET endpoints for retrieving normalized data with joins
@api_bp.route("/combined/usuarios/<int:usuario_id>", methods=["GET"])
@jwt_required()
def get_usuario_combined(usuario_id):
    """Get Usuario with complete Persona and Direccion data"""
    usuario = Usuarios.query.get_or_404(usuario_id)
    persona = Personas.query.get(usuario.id_personas) if usuario.id_personas else None
    direccion = Direcciones.query.get(persona.id_direcciones) if persona else None
    
    result = serialize(usuario)
    if persona:
        result["persona"] = serialize(persona)
        if direccion:
            result["persona"]["direccion"] = serialize(direccion)
    
    return jsonify(result)

@api_bp.route("/combined/choferes/<int:chofer_id>", methods=["GET"])
@jwt_required()
def get_chofer_combined(chofer_id):
    """Get Chofer with complete Persona and Direccion data"""
    chofer = Choferes.query.get_or_404(chofer_id)
    persona = Personas.query.get(chofer.id_personas) if chofer.id_personas else None
    direccion = Direcciones.query.get(persona.id_direcciones) if persona else None
    
    result = serialize(chofer)
    if persona:
        result["persona"] = serialize(persona)
        if direccion:
            result["persona"]["direccion"] = serialize(direccion)
    
    return jsonify(result)

@api_bp.route("/combined/granjas/<int:granja_id>", methods=["GET"])
@jwt_required()
def get_granja_combined(granja_id):
    """Get Granja with complete Ubicacion and Direccion data"""
    granja = Granjas.query.get_or_404(granja_id)
    ubicacion = Ubicaciones.query.get(granja.id_ubicaciones) if granja.id_ubicaciones else None
    direccion = Direcciones.query.get(ubicacion.id_direcciones) if ubicacion else None
    
    result = serialize(granja)
    if ubicacion:
        result["ubicacion"] = serialize(ubicacion)
        if direccion:
            result["ubicacion"]["direccion"] = serialize(direccion)
    
    return jsonify(result)

@api_bp.route("/combined/usuarios", methods=["GET"])
@jwt_required()
def list_usuarios_combined():
    """List all Usuarios with their Persona data"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = max(1, min(per_page, 100))
    
    pagination = Usuarios.query.order_by(Usuarios.id).paginate(page=page, per_page=per_page, error_out=False)
    
    items = []
    for usuario in pagination.items:
        result = serialize(usuario)
        persona = Personas.query.get(usuario.id_personas) if usuario.id_personas else None
        if persona:
            result["persona"] = serialize(persona)
        items.append(result)
    
    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages
    })

@api_bp.route("/combined/choferes", methods=["GET"])
@jwt_required()
def list_choferes_combined():
    """List all Choferes with their Persona data"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = max(1, min(per_page, 100))
    
    pagination = Choferes.query.order_by(Choferes.id).paginate(page=page, per_page=per_page, error_out=False)
    
    items = []
    for chofer in pagination.items:
        result = serialize(chofer)
        persona = Personas.query.get(chofer.id_personas) if chofer.id_personas else None
        if persona:
            result["persona"] = serialize(persona)
        items.append(result)
    
    return jsonify({
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages
    })

# ---------- CRUD ----------
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
    items = [serialize(x) for x in pagination.items]

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
    return jsonify([serialize(x) for x in items])

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
        items = [serialize(x) for x in pagination.items]

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
    
    # Si piden un usuario y el id es "me", obtenemos el ID desde el token
    if resource == "usuarios" and id_ == "me":
        id_ = get_jwt_identity()

    # Validamos que el ID final sea numérico
    if not str(id_).isdigit():
        return jsonify({"error": "ID inválido"}), 400

    obj = model.query.get_or_404(int(id_))
    return jsonify(serialize(obj))

@api_bp.route("/<resource>", methods=["POST"])
@jwt_required()
def create_resource(resource):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    data = request.get_json(force=True) or {}
    print("Creating resource:", resource, "with data:", data)
    data.pop("created_at", None)

    # CAMBIO: Manejo especial para usuarios (hashear contraseña)
    if resource == "usuarios" and "contrasena" in data:
        data["contraseña"] = generate_password_hash(data.pop("contrasena"))

    ok, err = validate_payload(model, data, partial=False)
    if not ok:
        return jsonify({"error": err}), 400
    
    try:
        service = CRUDService(model)
        obj = service.create(data)

        return jsonify(serialize(obj)), 201

    except IntegrityError as e:
        from . import db
        db.session.rollback() # Revertir la transacción fallida
        # Mensaje amigable para el usuario
        return jsonify({"error": "El registro ya existe. Verifique campos únicos (Cédula, Placa, Código, etc)."}), 409
    except Exception as e:
        return jsonify({"error": f"Error interno: {str(e)}"}), 500

@api_bp.route("/<resource>/<int:id_>", methods=["PUT"])
@jwt_required()
def update_resource(resource, id_):
    model = MODEL_MAP.get(resource)
    if not model:
        return jsonify({"error": "Recurso no encontrado"}), 404
    data = request.get_json(force=True) or {}

    # CAMBIO: Elimina peso_neto si viene en el payload (para cualquier modelo)
    data.pop("peso_neto", None)

    # Manejo especial para usuarios
    if resource == "usuarios" and "contrasena" in data:
        pwd = data.pop("contrasena")
        if pwd:
            data["contraseña"] = generate_password_hash(pwd)

    ok, err = validate_payload(model, data, partial=True)
    if not ok:
        return jsonify({"error": err}), 400
    service = CRUDService(model)
    obj = service.update(id_, data)
    return jsonify(serialize(obj))

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

    return jsonify(serialize(obj))

# ---------- SERIAL PORT ----------

# NUEVA RUTA: Úsala para ver qué puertos detecta realmente tu PC
@api_bp.route("/serial/list", methods=["GET"])
@jwt_required()
def list_serial_ports():
    ports = serial.tools.list_ports.comports()
    result = []
    for port in ports:
        result.append({
            "device": port.device,       # El nombre que debes poner en SERIAL_PORT (ej: COM3)
            "name": port.name,
            "description": port.description,
            "hwid": port.hwid
        })
    return jsonify(result)

@api_bp.route("/serial/read", methods=["GET"])
@jwt_required()
def read_serial():
    # CONFIGURACIÓN: CAMBIA ESTO por el valor 'device' que obtengas en /serial/list
    # CAMBIADO A COM2 para escuchar lo que envía el script simulador en COM1
    SERIAL_PORT = 'COM2' 
    BAUD_RATE = 9600
    TIMEOUT = 5 # Reducimos un poco el timeout para que no bloquee tanto si falla

    try:
        # Intentamos abrir el puerto y leer
        with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=TIMEOUT) as ser:
            # flushInput limpia el buffer para leer solo los datos más recientes
            ser.reset_input_buffer() 
            
            # Leemos una línea (hasta encontrar un caracter de nueva línea \n)
            data_bytes = ser.readline()
            
            if data_bytes:
                # Decodificamos los bytes a string
                data_str = data_bytes.decode('utf-8', errors='ignore').strip()
                return jsonify({"data": data_str, "status": "success"})
            else:
                return jsonify({"error": "Tiempo de espera agotado, no se recibieron datos", "status": "timeout"}), 408

    except serial.SerialException as e:
        return jsonify({"error": f"No se pudo acceder al puerto {SERIAL_PORT}. Verifique conexión.", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "Error inesperado leyendo puerto serial", "details": str(e)}), 500

# ---------- TICKETS PESAJE ----------

@api_bp.route("/tickets_pesaje/registrar_peso", methods=["POST"])
@jwt_required()
def registrar_peso_ticket():
    data = request.get_json(force=True) or {}
    ticket_id = data.get("id")
    tipo_peso = data.get("tipo_peso")  # "bruto" o "tara"
    peso = data.get("peso")

    if not ticket_id or tipo_peso not in ("bruto", "tara") or peso is None:
        return jsonify({"error": "Datos requeridos: id, tipo_peso (bruto|tara), peso"}), 400

    ticket = TicketsPesaje.query.get(ticket_id)
    if not ticket:
        return jsonify({"error": "Ticket no encontrado"}), 404

    if tipo_peso == "bruto":
        ticket.peso_bruto = peso
    elif tipo_peso == "tara":
        ticket.peso_tara = peso

    # Si ambos pesos están presentes, calcular neto y marcar como finalizado
    if ticket.peso_bruto and ticket.peso_tara:
        ticket.peso_neto = abs(ticket.peso_bruto - ticket.peso_tara)
        ticket.estado = "Finalizado"
    else:
        ticket.estado = "En Proceso"

    from . import db
    db.session.commit()
    
    return jsonify(serialize(ticket))

# ---------- IMPRESION DE TICKET ----------

@api_bp.route("/tickets_pesaje/<int:ticket_id>/imprimir", methods=["POST"])
@jwt_required()
def imprimir_ticket(ticket_id):
    """
    Retorna los datos del ticket para que el Frontend genere la impresión.
    Opcional: Marca en BD que fue impreso (si existiera el campo, ej: ticket.veces_impreso += 1).
    """
    ticket = TicketPesaje.query.get_or_404(ticket_id)
    
    # TODO: The new schema uses Asignaciones which links vehiculo and chofer
    # For now, we'll need to handle this differently once we migrate the actual data
    # This is a compatibility issue that will need to be addressed
    # vehiculo = Vehiculos.query.get(ticket.id_vehiculo)
    # chofer = Choferes.query.get(ticket.id_chofer)
    # Datos básicos
    # TODO: Needs to be updated to work with new schema using Asignaciones
    # placa = vehiculo.placa if vehiculo else "N/A"
    # nombre_chofer = f"{chofer.nombre} {chofer.apellido}" if chofer else "N/A"
    placa = "N/A"  # Temporary placeholder
    nombre_chofer = "N/A"  # Temporary placeholder
    producto = Productos.query.get(ticket.id_producto)
    nombre_producto = producto.nombre if producto else "N/A"
    
    # Formatear Fechas y Pesos
    fecha_str = ticket.created_at.strftime("%d/%m/%Y") if ticket.created_at else datetime.datetime.now().strftime("%d/%m/%Y")
    hora_str = datetime.datetime.now().strftime("%I:%M:%S %p")
    
    # Si no tienen valor envia 0
    p_tara = float(ticket.peso_tara) if ticket.peso_tara is not None else 0.0
    p_bruto = float(ticket.peso_bruto) if ticket.peso_bruto is not None else 0.0

    # Si hay ambos pesos, usamos el neto de la BD (si existe) o calculamos la diferencia
    if p_bruto > 0 and p_tara > 0:
        p_neto = float(ticket.peso_neto) if ticket.peso_neto is not None else abs(p_bruto - p_tara)
    else:
        p_neto = 0.0

    # Construir el texto base por si el frontend lo necesita para impresoras térmicas (RAW)
    ticket_text = f"""
AVICOLA LA ROSITA, S.A.
        MARA I
           
ASUNTO: {ticket.tipo.upper() or 'Entrada/Salida'} DE MERCANCIA
--------------------------
TICKET #: {ticket.nro_ticket}
FECHA:    {fecha_str}
    
PLACA:    {placa}
CHOFER:   {nombre_chofer}
PROD:     {nombre_producto}
--------------------------
TARA:     {p_tara:,.2f} Kg
BRUTO:    {p_bruto:,.2f} Kg
HORA:     {hora_str}
--------------------------
KILOS NETO -> {p_neto:,.2f} Kg
    """
    
    # LOGICA DE REGISTRO (Opcional):
    # Aquí podrías guardar un log de auditoría o incrementar un contador en el ticket
    # ticket.impreso = True
    # db.session.commit()

    # Devolvemos solo datos crudos, el frontend se encarga del formato
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

@api_bp.route("/tickets_pesaje", methods=["POST"])
@jwt_required()
def create_ticket_pesaje():
    from .models import TicketsPesaje
    from . import db
    import uuid

    data = request.get_json(force=True) or {}

    data.pop("nro_ticket", None)
    data.pop("peso_neto", None)

    ok, err = validate_payload(TicketsPesaje, data, partial=False)
    if not ok:
        return jsonify({"error": err}), 400

    # Temporal único para cumplir UNIQUE
    temp_code = f"PEND-{uuid.uuid4().hex[:8]}"
    ticket = TicketsPesaje(nro_ticket=temp_code, **data)
    db.session.add(ticket)
    db.session.commit()

    ticket.nro_ticket = f"TKT-{ticket.id:06d}"
    db.session.commit()

    return jsonify(serialize(ticket)), 201
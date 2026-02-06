from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import IntegrityError # <--- AGREGAR ESTO
import serial
import serial.tools.list_ports 
import datetime # Agregado para formatear fechas

from .models import (
    Usuarios, Roles, EmpresasTransporte, Granjas, Productos, Galpones,
    Vehiculos, Choferes, TicketsPesaje, DetallesTransporteAves
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
    "tickets_pesaje": TicketsPesaje,
    "detalles_transporte_aves": DetallesTransporteAves,
}

def serialize(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

# ---------- AUTH ----------
@api_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    
    print("Registering user with data:", data)
    nombre_usuario = data.get("nombre_usuario")
    contrasena = data.get("contrasena")
    if not nombre_usuario or not contrasena:
        return jsonify({"error": "nombre_usuario y contrasena son requeridos"}), 400

    user = Usuarios.query.filter_by(nombre_usuario=nombre_usuario).first()
    print("contraseña:", generate_password_hash("123456"))

    if not user or not check_password_hash(user.contrasena_hash, contrasena):
        return jsonify({"error": "Credenciales inválidas"}), 401

    # Incluimos el id_rol en los claims del token
    token = create_access_token(identity=str(user.id), additional_claims={"id_rol": user.id_rol})
    return jsonify({"access_token": token})

@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    if "contrasena" not in data:
        return jsonify({"error": "contrasena es requerida"}), 400

    # CAMBIO: Usar la clave correcta del modelo (contrasena_hash)
    data["contrasena_hash"] = generate_password_hash(data.pop("contrasena"))
    
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
    user_rol= get_jwt().get("id_rol")
    return jsonify({"valid": True, "user_id": user_id, "user_rol": user_rol})

@api_bp.route("/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    jwt_blocklist.add(jti)
    return jsonify({"logged_out": True})

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
    data.pop("fecha_registro", None)

    # Solo productos: ignorar codigo del frontend
    if resource == "productos" and "codigo" in data:
        data.pop("codigo")

    # CAMBIO: Manejo especial para usuarios (hashear contraseña)
    if resource == "usuarios" and "contrasena" in data:
        data["contrasena_hash"] = generate_password_hash(data.pop("contrasena"))

    # Productos: codigo temporal para cumplir NOT NULL
    if resource == "productos":
        data["codigo"] = "PENDIENTE"

    ok, err = validate_payload(model, data, partial=False)
    if not ok:
        return jsonify({"error": err}), 400
    
    try:
        service = CRUDService(model)
        obj = service.create(data)

        # Generar código definitivo basado en ID
        if resource == "productos":
            obj.codigo = f"PRD-{obj.id:06d}"
            from . import db
            db.session.commit()

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
            data["contrasena_hash"] = generate_password_hash(pwd)

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
    obj.eliminado = True

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
    ticket = TicketsPesaje.query.get_or_404(ticket_id)
    
    # Cargar relaciones manualmente
    vehiculo = Vehiculos.query.get(ticket.id_vehiculo)
    chofer = Choferes.query.get(ticket.id_chofer)
    producto = Productos.query.get(ticket.id_producto)
    
    # Datos básicos
    placa = vehiculo.placa if vehiculo else "N/A"
    nombre_chofer = f"{chofer.nombre} {chofer.apellido}" if chofer else "N/A"
    nombre_producto = producto.nombre if producto else "N/A"
    
    # Formatear Fechas y Pesos
    fecha_str = ticket.fecha_registro.strftime("%d/%m/%Y") if ticket.fecha_registro else datetime.datetime.now().strftime("%d/%m/%Y")
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
           
ASUNTO: {ticket.tipo_proceso.upper() or 'Entrada/Salida'} DE MERCANCIA
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
        "tipo_proceso": ticket.tipo_proceso.upper() or 'ENTRADA/SALIDA',
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
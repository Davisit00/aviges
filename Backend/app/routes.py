from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from .models import (
    Usuarios, EmpresasTransporte, Granjas, Productos, Galpones,
    Vehiculos, Choferes, TicketsPesaje, DetallesTransporteAves
)
from .services.crud import CRUDService
from .services.validation import validate_payload
from .jwt_blocklist import jwt_blocklist

api_bp = Blueprint("api", __name__)

MODEL_MAP = { 
    "usuarios": Usuarios,
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
    nombre_usuario = data.get("nombre_usuario")
    contrasena = data.get("contrasena")
    if not nombre_usuario or not contrasena:
        return jsonify({"error": "nombre_usuario y contrasena son requeridos"}), 400

    user = Usuarios.query.filter_by(nombre_usuario=nombre_usuario).first()
    if not user or not check_password_hash(user.contrasena_hash, contrasena):
        return jsonify({"error": "Credenciales inválidas"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": token})

@api_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    if "contrasena" not in data:
        return jsonify({"error": "contrasena es requerida"}), 400

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
    return jsonify({"valid": True, "user_id": user_id})

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
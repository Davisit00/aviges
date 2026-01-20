from flask import Flask
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .db import db
from .routes import api_bp
from config import Config
from .jwt_blocklist import jwt_blocklist

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    Migrate(app, db)
    jwt = JWTManager(app)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return jwt_payload["jti"] in jwt_blocklist

    app.register_blueprint(api_bp, url_prefix="/api")

    return app
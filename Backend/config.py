import os
from dotenv import load_dotenv

load_dotenv()

def _bool(val: str, default: bool = False) -> bool:
    if val is None:
        return default
    return val.lower() in ("1", "true", "yes", "y")

class Config:
    SERVER = os.getenv("DATABASE_SERVER", "localhost")
    DB = os.getenv("DATABASE_NAME", "GestionRomanaAvicola")
    USER = os.getenv("DATABASE_USER", "sa")
    PASSWORD = os.getenv("DATABASE_PASSWORD", "")
    DRIVER = os.getenv("DATABASE_DRIVER", "ODBC Driver 18 for SQL Server")
    TRUST_CERT = _bool(os.getenv("DATABASE_TRUST_CERT"), True)

    SQLALCHEMY_DATABASE_URI = (
        f"mssql+pyodbc://{USER}:{PASSWORD}@{SERVER}/{DB}"
        f"?driver={DRIVER.replace(' ', '+')}"
        f"&TrustServerCertificate={'yes' if TRUST_CERT else 'no'}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "1234")
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_ACCESS_TOKEN_EXPIRES = 720 * 60  # 12 horas
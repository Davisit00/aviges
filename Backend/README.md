# Backend Flask + SQL Server (GestionRomanaAvicola)

Backend en Flask con SQLAlchemy para SQL Server 2019. Incluye CRUD genérico para todas las tablas definidas en el script SQL.

## ✅ Qué se implementó

- **Flask** como framework web.
- **SQLAlchemy** como ORM.
- **SQL Server 2019** con driver **pyodbc**.
- **Variables de entorno** con `python-dotenv`.
- **CRUD genérico** para todas las tablas.
- **Paginación** en listados.
- **Validación básica** de payload.
- **Auth JWT** (login y registro).
- **Migraciones** con Flask-Migrate.

## 📁 Estructura del proyecto

```
Backend/
├─ app/
│  ├─ __init__.py
│  ├─ db.py
│  ├─ models.py
│  ├─ routes.py
│  └─ services/
│     ├─ crud.py
│     └─ validation.py
├─ migrations/
├─ .env
├─ config.py
├─ requirements.txt
├─ run.py
└─ README.md
```

## ⚙️ Requisitos

- Python 3.10+ (recomendado 3.12)
- SQL Server 2019 (Express)
- ODBC Driver 18 for SQL Server

## 📦 Instalación

1. Crear y activar entorno virtual:

```
python -m venv env
env\Scripts\activate
```

2. Instalar dependencias:

```
pip install -r requirements.txt
```

## 🧩 Variables de entorno (.env)

```
FLASK_ENV=development
FLASK_APP=run.py
DATABASE_SERVER=localhost\SQLEXPRESS
DATABASE_NAME=GestionRomanaAvicola
DATABASE_USER=sa
DATABASE_PASSWORD=123456
DATABASE_DRIVER=ODBC Driver 18 for SQL Server
DATABASE_TRUST_CERT=yes
JWT_SECRET_KEY=1234
```

## 🗄️ Base de datos

1. Ejecuta el script SQL (`BDD.sql`) en SQL Server.
2. Verifica que la base `GestionRomanaAvicola` exista.

## ▶️ Ejecutar el servidor

```
python run.py
```

## 🔐 Auth (JWT)

### Registro

```
POST /api/auth/register
Content-Type: application/json

{
  "nombre_usuario": "admin",
  "contrasena": "123456",
  "nombre": "Admin",
  "apellido": "Principal",
  "id_rol": 1
}
```

### Login

```
POST /api/auth/login
```

### Validar token

```
GET /api/auth/validate
Authorization: Bearer <access_token>
```

### Logout (invalidar token)

```
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## 🔗 Endpoints CRUD

- **Listar (paginado)**: `GET /api/<resource>?page=1&per_page=20`
- **Listar todo**: `GET /api/<resource>/all`
- **Obtener**: `GET /api/<resource>/<id>`
- **Crear**: `POST /api/<resource>`
- **Actualizar**: `PUT/PATCH /api/<resource>/<id>`
- **Eliminar**: `DELETE /api/<resource>/<id>`

## 🔄 Bulk (varios recursos)

```
POST /api/bulk
{
  "resources": ["productos", "granjas"],
  "page": 1,
  "per_page": 20
}
```

## ✅ Paginación

Parámetros:

- `page` (default 1)
- `per_page` (default 20, máx 100)

Respuesta:

```
{
  "items": [...],
  "page": 1,
  "per_page": 20,
  "total": 123,
  "pages": 7
}
```

## ✅ Validación

- Campos desconocidos → error.
- Campos requeridos → error.
- Tipos básicos (int, bool, string, numeric) → error.

## 🧬 Migraciones

```
flask --app run.py db init
flask --app run.py db migrate -m "init"
flask --app run.py db upgrade
```

Si recibes “Target database is not up to date”:

```
flask --app run.py db upgrade
```

## 🛠️ Notas

- El CRUD es genérico, no incluye validaciones por negocio.
- Para producción, agrega manejo de errores avanzado y rotación de JWT.
- Si cambia el driver, actualiza `DATABASE_DRIVER` en `.env`.

## COMANDO PARA INSTALAR LAS LIBRERIAS DE PYTHON

python -m pip install -r requirements.txt

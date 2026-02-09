# Migration Guide: Old Schema to New BDD Schema

## Overview
This document describes the changes made to synchronize the Backend models with the updated database schema defined in `BDD/AVIGESBDD.sql`.

## Major Schema Changes

### 1. Field Name Changes (All Tables)
- `eliminado` → `is_deleted`
- `fecha_registro` → `created_at`

### 2. New Base Tables

#### Direcciones
New table for managing addresses:
- `id`, `pais`, `estado`, `municipio`, `sector`, `descripcion`
- Used by: Personas, Empresas_transportes, Ubicaciones

#### Personas
New table for managing person information:
- `id`, `id_direcciones`, `nombre`, `apellido`, `cedula`
- Used by: Usuarios, Choferes

#### Telefonos
New table for phone numbers:
- `id`, `id_personas`, `numero`, `estado` (Celular/Casa/Trabajo)

#### Ubicaciones
New table for locations with types:
- `id`, `id_direcciones`, `nombre`, `tipo`
- Types: Granja, Matadero, Balanceados, Despresados, Incubadora, Reciclaje, Proveedor, Cliente, Almacen
- Used by: Granjas, Ticket_pesaje (origen/destino)

### 3. Table Structure Changes

#### Usuarios
**Old Schema:**
```javascript
{
  id, nombre_usuario, contrasena_hash, nombre, apellido, id_rol
}
```

**New Schema:**
```javascript
{
  id, id_personas, id_roles, usuario, contraseña
}
```
- Now references Personas table for personal info
- `nombre_usuario` → `usuario`
- `contrasena_hash` → `contraseña`
- `id_rol` → `id_roles`

#### Choferes
**Old Schema:**
```javascript
{
  id, cedula, nombre, apellido, id_empresa_transporte
}
```

**New Schema:**
```javascript
{
  id, id_personas, id_empresas_transportes
}
```
- Now references Personas table
- Personal data moved to Personas

#### Empresas_Transporte → Empresas_transportes
**Old Schema:**
```javascript
{
  id, nombre, rif
}
```

**New Schema:**
```javascript
{
  id, id_direcciones, rif, nombre
}
```
- Now references Direcciones table
- Table name pluralized

#### Granjas
**Old Schema:**
```javascript
{
  id, nombre, direccion, dueno
}
```

**New Schema:**
```javascript
{
  id, id_ubicaciones, rif
}
```
- Now references Ubicaciones table
- Ubicaciones contains the name and address

#### Galpones
**Changes:**
- `codigo` → `nro_galpon` (now an integer)

#### Productos
**Removed fields:**
- `codigo` (was auto-generated, removed in new schema)
- `es_ave_viva` (removed in new schema)

#### Vehiculos
**Changes:**
- `id_empresa_transporte` → `id_empresas_transportes`
- **Removed fields:** `descripcion`, `peso_tara`

#### Tickets_Pesaje → Ticket_pesaje
**Old Schema:**
```javascript
{
  id, nro_ticket, tipo_proceso, id_vehiculo, id_chofer, id_producto, 
  id_usuario, peso_bruto, peso_tara, peso_neto, peso_avisado, 
  cantidad_cestas, estado
}
```

**New Schema:**
```javascript
{
  id, id_producto, id_asignaciones, id_usuarios_primer_peso, 
  id_usuarios_segundo_peso, id_origen, id_destino, nro_ticket, 
  tipo, peso_bruto, peso_tara, peso_neto, estado, 
  fecha_primer_peso, fecha_segundo_peso
}
```
- Now uses Asignaciones (vehicle-driver assignment) instead of direct references
- Tracks two users (first and second weighing)
- Uses Ubicaciones for origen/destino
- `tipo_proceso` → `tipo` (Entrada/Salida)
- **Removed fields:** `peso_avisado`, `cantidad_cestas`

### 4. New Journey Tracking Tables

#### Asignaciones
Vehicle-driver assignments:
- `id`, `id_vehiculos`, `id_chofer`, `fecha`, `hora`, `active`

#### Lotes
Batch/lot tracking:
- `id`, `id_galpones`, `codigo_lote`, `fecha_alojamiento`, `cantidad_aves`

#### Viajes_tiempos
Journey time tracking:
- `id`, `id_ticket`, `hora_salida_granja`, `hora_inicio_descarga`, `hora_fin_descarga`
- `tiempo_transito`, `tiempo_espera`, `tiempo_operacion`

#### Viajes_conteos
Bird counting:
- `id`, `id_ticket`, `aves_guia`, `aves_recibidas`, `aves_faltantes`, `aves_aho`
- `numero_de_jaulas`, `peso_promedio_jaulas`, `aves_por_jaula`

#### Viajes_origen
Origin details:
- `id`, `id_ticket`, `id_lote`, `numero_de_orden`

#### Estadisticas
Statistics (auto-calculated by triggers):
- `id`, `id_ticket`, `porcentaje_aves_faltantes`, `porcentaje_aves_ahogadas`, `peso_promedio_aves`

### 5. Deprecated Table
- `Detalles_Transporte_Aves` - Functionality replaced by journey tracking tables

## API Changes

### Combined Endpoints (New!)

To simplify working with normalized data, new combined endpoints have been added that allow creating entities with their related data in a single transaction:

#### Create Usuario with Persona and Direccion
```http
POST /api/combined/usuarios
Content-Type: application/json
Authorization: Bearer <token>

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
```

#### Create Chofer with Persona and Direccion
```http
POST /api/combined/choferes
Content-Type: application/json
Authorization: Bearer <token>

{
  "id_empresas_transportes": 1,
  "persona": {
    "nombre": "Juan",
    "apellido": "Perez",
    "cedula": "98765432",
    "direccion": {
      "pais": "Venezuela",
      "estado": "Zulia",
      "municipio": "Maracaibo",
      "sector": "Sur",
      "descripcion": "Calle 1"
    }
  }
}
```

#### Create Empresa de Transporte with Direccion
```http
POST /api/combined/empresas_transporte
Content-Type: application/json
Authorization: Bearer <token>

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
```

#### Create Granja with Ubicacion and Direccion
```http
POST /api/combined/granjas
Content-Type: application/json
Authorization: Bearer <token>

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
```

#### Get Combined Data
```http
GET /api/combined/usuarios/:id
GET /api/combined/usuarios  (list with pagination)
GET /api/combined/choferes/:id
GET /api/combined/choferes  (list with pagination)
GET /api/combined/granjas/:id
```

These endpoints return the entity with all related data nested:
```json
{
  "id": 1,
  "usuario": "admin",
  "id_personas": 1,
  "id_roles": 1,
  "persona": {
    "id": 1,
    "nombre": "Admin",
    "apellido": "Principal",
    "cedula": "12345678",
    "direccion": {
      "id": 1,
      "pais": "Venezuela",
      "estado": "Zulia",
      "municipio": "Maracaibo",
      "sector": "Centro"
    }
  }
}
```

### Authentication Endpoints

#### Login
**Old Request:**
```json
{
  "nombre_usuario": "admin",
  "contrasena": "123456"
}
```

**New Request:**
```json
{
  "usuario": "admin",
  "contrasena": "123456"
}
```

**Response:**
```json
{
  "access_token": "..."
}
```
- Token now includes `id_roles` instead of `id_rol`

#### Register
**Old Request:**
```json
{
  "nombre_usuario": "admin",
  "contrasena": "123456",
  "nombre": "Admin",
  "apellido": "Principal",
  "id_rol": 1
}
```

**New Request:**
```json
{
  "usuario": "admin",
  "contrasena": "123456",
  "id_personas": 1,
  "id_roles": 1
}
```
- **Important:** Must create Persona record first

### CRUD Endpoints

All CRUD endpoints remain the same pattern:
- `GET /api/<resource>` - List with pagination
- `GET /api/<resource>/all` - List all
- `GET /api/<resource>/<id>` - Get one
- `POST /api/<resource>` - Create
- `PUT /api/<resource>/<id>` - Update
- `DELETE /api/<resource>/<id>` - Soft delete (sets is_deleted=true)

**New Resources Available:**
- `/api/direcciones`
- `/api/personas`
- `/api/telefonos`
- `/api/ubicaciones`
- `/api/asignaciones`
- `/api/lotes`
- `/api/viajes_tiempos`
- `/api/viajes_conteos`
- `/api/viajes_origen`
- `/api/estadisticas`

## Migration Steps

### Backend Migration
1. ✅ Models updated in `Backend/app/models.py`
2. ✅ Routes updated in `Backend/app/routes.py`
3. ✅ Migration file created in `Backend/migrations/versions/`
4. ⚠️ **Manual Data Migration Required** - Run migration after backing up database

### Frontend Migration (COMPLETED)
1. ✅ Update `src/pages/resourceConfigs.js`:
   - Changed all `fecha_registro` to `created_at`
   - Updated usuarios config to use nested fields (persona.nombre, persona.direccion.*)
   - Updated choferes config to use nested persona fields
   - Updated empresas_transporte to use nested direccion fields
   - Updated granjas to use nested ubicacion and direccion fields
   - Removed deprecated fields (codigo, es_ave_viva, peso_tara, descripcion)
   - Updated tickets_pesaje for new structure

2. ✅ Update `src/pages/resourceCrud.js`:
   - Added support for nested field handling (dotted notation)
   - Updated `getFormData()` to build nested objects from form inputs
   - Updated `setFormData()` to populate form from nested objects
   - Updated `getDisplayLabel()` to handle combined endpoint responses
   - Updated FK resource mapping for new table names
   - Changed `fecha_registro` checks to `created_at`

3. ✅ Update `src/pages/core.js`:
   - Changed `id_rol` to `id_roles` for role checks
   - Added fallback to `user_rol` from token validation

4. ✅ Update `src/pages/resourcePrint.js`:
   - Updated `getDisplayLabel()` to handle combined responses

5. ✅ Update `src/pages/ticketsPesaje.js`:
   - Changed `fecha_registro` to `created_at` with fallback

### Frontend Usage

The Frontend now automatically uses the combined endpoints for usuarios, choferes, empresas_transporte, and granjas. When creating these entities:

1. **Creating a User**: Simply fill in the form fields including nombre, apellido, cedula, and address fields. The Frontend will automatically structure the data for the combined endpoint.

2. **Creating a Chofer**: Fill in persona details and address. The system creates Direccion → Persona → Chofer in one transaction.

3. **Viewing Data**: When viewing users or choferes, the system automatically fetches and displays nested persona data.

## Breaking Changes Summary

### Critical Breaking Changes
1. **Usuarios:** No longer has `nombre` and `apellido` directly - must use Personas
2. **Choferes:** No longer has `cedula`, `nombre`, `apellido` - must use Personas
3. **Granjas:** No longer has `nombre`, `direccion`, `dueno` - must use Ubicaciones
4. **Tickets_Pesaje:** Uses Asignaciones instead of direct vehicle/driver references
5. **All authentication and user management:** Field names changed

### Data Migration Required
- Migrate user personal data to Personas table
- Migrate chofer personal data to Personas table
- Migrate granja data to Ubicaciones table
- Create Direcciones records for all entities
- Create Asignaciones records for existing tickets

## Compatibility Notes

### Backward Compatibility
- ❌ **NOT backward compatible** - This is a breaking change
- Frontend must be updated to work with new field names
- Existing tickets may need data restructuring

### Database Triggers
New triggers added:
- `TR_SyncLlegadaTiempos` - Syncs arrival time in Viajes_tiempos
- `TR_GenerarEstadisticas` - Auto-generates statistics when ticket is finalized

### Stored Procedures
New stored procedure:
- `SP_FinalizarTicketPesaje` - Finalizes ticket with second weight

## Testing Checklist

### Backend Testing
- [x] Combined endpoints created and syntax-validated
- [ ] Test authentication (login, register, validate) - requires database
- [ ] Test combined endpoints with actual database
- [ ] Test CRUD operations for all existing resources
- [ ] Test CRUD operations for new resources
- [ ] Test soft delete (is_deleted flag)
- [ ] Verify foreign key constraints
- [ ] Test ticket creation with new structure

### Frontend Testing
- [x] Updated field configurations
- [x] Added nested field support
- [ ] Test login with new field names - requires running application
- [ ] Test user management with combined endpoints
- [ ] Test chofer management with combined endpoints
- [ ] Test empresa transporte management
- [ ] Test granja management
- [ ] Test all resource CRUD pages
- [ ] Test ticket creation workflow
- [ ] Verify display of timestamps (created_at)

## Rollback Plan

If issues arise:
1. Keep backup of old database
2. Revert Backend code: `git revert <commit-hash>`
3. Restore database from backup
4. Previous version uses old field names

## Support

For questions or issues with the migration:
1. Check the BDD schema: `BDD/AVIGESBDD.sql`
2. Review triggers: `BDD/TRIGGERS AVIGES.sql`
3. Review stored procedures: `BDD/SP AVIGES.sql`

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

### Frontend Migration (TODO)
1. Update `src/pages/resourceConfigs.js`:
   - Change all `fecha_registro` to `created_at`
   - Update usuarios config for new structure
   - Update choferes config to remove personal fields
   - Update vehiculos config to remove deprecated fields
   - Add configs for new resources

2. Update `src/pages/core.js`:
   - Change `id_rol` to `id_roles`

3. Update `src/pages/resourceCrud.js`:
   - Change `nombre_usuario` to `usuario`
   - Change `fecha_registro` to `created_at`

4. Update `src/pages/resourcePrint.js`:
   - Change `nombre_usuario` to `usuario`

5. Update `src/pages/ticketsPesaje.js`:
   - Change `fecha_registro` to `created_at`

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
- [ ] Test authentication (login, register, validate)
- [ ] Test CRUD operations for all existing resources
- [ ] Test CRUD operations for new resources
- [ ] Test soft delete (is_deleted flag)
- [ ] Verify foreign key constraints
- [ ] Test ticket creation with new structure

### Frontend Testing
- [ ] Test login with new field names
- [ ] Test user management
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

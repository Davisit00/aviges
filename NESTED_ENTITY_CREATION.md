# Creación de Entidades Relacionadas (Nested Entity Creation)

## Descripción General

Esta funcionalidad permite crear entidades relacionadas directamente desde el formulario de creación de otra entidad, sin necesidad de que existan previamente en el sistema.

## Problema que Resuelve

**Antes:** Si querías crear un Vehículo que pertenece a una Empresa de Transporte que aún no existe en el sistema, tenías que:
1. Cancelar la creación del Vehículo
2. Ir a Empresas de Transporte
3. Crear la nueva Empresa
4. Volver a Vehículos
5. Crear el Vehículo y seleccionar la Empresa recién creada

**Ahora:** Puedes crear la Empresa de Transporte directamente desde el formulario de creación del Vehículo con un solo clic.

## Cómo Usar

### Paso 1: Crear una Entidad con Relaciones
1. Accede a cualquier módulo CRUD (por ejemplo, Vehículos)
2. Haz clic en el botón "+ Nueva Entrada"
3. Se abrirá el formulario de creación

### Paso 2: Crear Entidad Relacionada
Cuando veas un campo con lista desplegable (por ejemplo, "Empresa Transporte"):
1. Busca el botón verde **"+ Nuevo"** al lado del campo
2. Haz clic en ese botón
3. Se abrirá una ventana modal con el formulario para crear la entidad relacionada

### Paso 3: Completar el Formulario Anidado
1. Completa los campos requeridos (marcados con asterisco rojo *)
2. Si la entidad anidada también tiene relaciones, verás listas desplegables con las opciones existentes
3. Haz clic en **"Guardar"**

### Paso 4: Continuar con el Formulario Principal
1. La nueva entidad se seleccionará automáticamente en el campo del formulario principal
2. Completa el resto del formulario
3. Guarda la entidad principal

## Ejemplos de Uso

### Ejemplo 1: Crear Vehículo con Nueva Empresa de Transporte

```
Formulario: Crear Vehículo
├─ Placa: ABC-123
├─ Descripción: Camión de aves
└─ Empresa Transporte: [+ Nuevo] ← Click aquí
    │
    └─ Modal: Crear Empresa de Transporte
        ├─ Nombre: Transportes El Rapidito *
        ├─ RIF: J-12345678-9
        └─ [Guardar] ← La empresa se crea y se selecciona automáticamente
```

### Ejemplo 2: Crear Chofer con Nueva Empresa de Transporte

```
Formulario: Crear Chofer
├─ Cédula: 12345678 *
├─ Nombre: Juan *
├─ Apellido: Pérez *
└─ Empresa Transporte: [+ Nuevo] ← Click aquí
    │
    └─ Modal: Crear Empresa de Transporte
        ├─ Nombre: Transportes Los Andes *
        ├─ RIF: J-98765432-1
        └─ [Guardar]
```

### Ejemplo 3: Crear Galpón con Nueva Granja

```
Formulario: Crear Galpón
├─ Código: G-01 *
├─ Capacidad: 10000
└─ Granja: [+ Nuevo] ← Click aquí
    │
    └─ Modal: Crear Granja
        ├─ Nombre: Granja La Esperanza *
        ├─ Dirección: Carretera Nacional
        ├─ Dueño: María García
        └─ [Guardar]
```

## Relaciones Soportadas

El sistema soporta creación anidada para TODAS las relaciones de clave foránea (FK):

| Entidad Principal | Puede Crear | Tipo de Relación |
|------------------|-------------|------------------|
| **Vehículos** | Empresas de Transporte | Opcional |
| **Choferes** | Empresas de Transporte | Opcional |
| **Galpones** | Granjas | Requerido |
| **Usuarios** | Roles | Requerido |
| **Tickets de Pesaje** | Vehículos, Choferes, Productos | Requeridos |
| **Detalles Transporte** | Granjas, Galpones | Requerido/Opcional |

## Características Técnicas

### Validación
- Los campos requeridos están marcados con asterisco rojo (*)
- El sistema valida que todos los campos requeridos estén completos antes de guardar
- Los campos incorrectos se resaltan en rojo

### Tipos de Datos
- **Texto**: Nombres, descripciones, códigos
- **Números**: Capacidades, pesos, edades
- **Selección**: Relaciones con otras entidades existentes
- **Checkboxes**: Valores booleanos (sí/no)

### Manejo de Errores
- Si falta un campo requerido, se muestra un mensaje de error
- Si hay un error al guardar en el servidor, se muestra el mensaje específico
- Los datos ingresados se conservan para que puedas corregir y reintentar

### Estado de Carga
- Mientras se cargan las opciones para los campos relacionados, verás "⏳ Cargando..."
- Mientras se guarda una entidad, el botón muestra "Guardando..."

## Notas Importantes

1. **Campos Opcionales vs Requeridos**: 
   - Los campos marcados con * son obligatorios
   - Los campos sin * son opcionales y puedes dejarlos vacíos

2. **Relaciones Anidadas**:
   - Si creas un Galpón desde un formulario, y el Galpón requiere una Granja, podrás seleccionar una Granja existente desde la lista desplegable
   - Actualmente no hay soporte para crear "sub-anidados" (crear Granja desde Galpón mientras estás creando Vehículo), pero la funcionalidad principal está disponible

3. **Campos de Solo Lectura**:
   - Algunos campos como fechas y códigos son auto-generados
   - No aparecerán en los formularios anidados

4. **Cancelar Creación**:
   - Si cancelas la creación de una entidad anidada, volverás al formulario principal
   - Los datos del formulario principal se conservan

## Solución de Problemas

### Problema: No veo el botón "+ Nuevo"
**Solución**: El botón solo aparece en campos de relación (listas desplegables). Los campos de texto normales no lo tienen.

### Problema: El formulario anidado está vacío o dice "Cargando..."
**Solución**: 
- Espera unos segundos, el sistema está cargando las opciones
- Si persiste, verifica tu conexión a internet
- Revisa la consola del navegador para errores

### Problema: Al guardar dice "Error al crear"
**Solución**:
- Verifica que completaste todos los campos requeridos (*)
- Revisa que no exista ya una entidad con el mismo código/cédula/placa
- Contacta al administrador si el problema persiste

### Problema: La entidad se creó pero no aparece seleccionada
**Solución**: Actualiza la página y busca la entidad recién creada manualmente. Esto puede ser un problema temporal.

## Beneficios

✅ **Ahorro de Tiempo**: Crea entidades relacionadas sin salir del formulario actual
✅ **Flujo Natural**: No interrumpe tu trabajo
✅ **Menos Clics**: Reduce pasos innecesarios
✅ **Intuitivo**: El botón "+ Nuevo" es fácil de encontrar y usar
✅ **Robusto**: Maneja errores y validaciones correctamente

## Preguntas Frecuentes

**P: ¿Puedo crear múltiples entidades anidadas en el mismo formulario?**
R: Sí, puedes crear tantas como necesites. Por ejemplo, al crear un Ticket de Pesaje, puedes crear el Vehículo, el Chofer y el Producto si no existen.

**P: ¿Qué pasa si cometo un error al crear una entidad anidada?**
R: Puedes ir al módulo correspondiente y editarla o eliminarla después.

**P: ¿Los cambios se guardan inmediatamente?**
R: Sí, cuando haces clic en "Guardar" en el formulario anidado, la entidad se crea en la base de datos inmediatamente.

**P: ¿Funciona en todos los módulos?**
R: Sí, funciona en todos los módulos CRUD que tienen relaciones con otras entidades.

---

**Última actualización**: 2024
**Versión**: 1.0

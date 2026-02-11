# CRUD Page Architecture

## Overview

The CRUD page logic has been refactored to allow individual customization per page while maintaining a shared base functionality.

## File Structure

```
Frontend/src/pages/
├── baseCrud.js              # Core CRUD functionality (shared logic)
├── resourceCrud.js          # Backward compatibility wrapper (DEPRECATED)
├── resourceConfigs.js       # Resource field configurations
├── products.js              # Default products page (uses resourceCrud)
├── products_custom.js       # Example: Custom products page
├── choferes.js              # Default choferes page (uses resourceCrud)
├── choferes_custom.js       # Example: Custom choferes page
└── ...other pages
```

## Usage

### Option 1: Use Default CRUD (Simplest)

For pages that don't need customization, continue using the default:

```javascript
// products.js
import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const ProductsInterface = createCrudPage(resourceConfigs.productos);
```

### Option 2: Create Custom Page (Recommended for Special Cases)

For pages that need specific customizations:

```javascript
// products_custom.js
import { createBaseCrudPage } from "./baseCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const ProductsInterface = createBaseCrudPage({
  ...resourceConfigs.productos,
  
  // Custom field rendering
  customRenderField: (field, resource) => {
    if (field.name === "codigo") {
      return ""; // Hide codigo field
    }
    return null; // Use default rendering
  },
  
  // Custom table row
  customTableRow: (item, fields, canEdit, canDelete) => {
    return `
      <td>${item.id}</td>
      <td><strong>${item.nombre}</strong></td>
      <td>${item.codigo}</td>
      <td>
        ${canEdit ? `<button class="edit-btn" data-id="${item.id}">Edit</button>` : ""}
      </td>
    `;
  },
  
  // Hooks for business logic
  beforeCreate: async (data) => {
    // Validate or transform data before creation
  },
  
  afterCreate: async (data) => {
    // Post-creation logic
  },
  
  beforeUpdate: async (data, id) => {
    // Validate before update
  },
  
  afterUpdate: async (data, id) => {
    // Post-update logic
  },
});
```

## Customization Options

### Available Hooks

- **customRenderField(field, resource)**: Customize how individual form fields are rendered
  - Return a string to use custom HTML
  - Return `null` to use default rendering
  - Return `""` to hide the field

- **customTableRow(item, fields, canEdit, canDelete)**: Customize table row rendering
  - Return HTML string for the entire row
  - Access item data, field definitions, and permissions

- **beforeCreate(data)**: Hook before creating a new record
  - Validate or transform data
  - Throw error to prevent creation

- **afterCreate(data)**: Hook after successfully creating a record
  - Trigger side effects
  - Update related data

- **beforeUpdate(data, id)**: Hook before updating a record
  - Validate changes
  - Throw error to prevent update

- **afterUpdate(data, id)**: Hook after successfully updating a record
  - Trigger side effects

- **customLoadTable(page, tableBody, currentItems, fields, canEdit, canDelete)**: Completely custom table loading logic

## Helper Functions

Import these from `baseCrud.js`:

- **getRelatedResourceName(fieldName)**: Convert field name to resource name
- **getDisplayLabel(item)**: Get display label for any item

## Migration Guide

### Migrating an Existing Page

1. **Keep using default** (no changes needed):
   ```javascript
   import { createCrudPage } from "./resourceCrud.js";
   ```

2. **Add custom logic**:
   ```javascript
   // Change import
   import { createBaseCrudPage } from "./baseCrud.js";
   
   // Add customizations
   export const MyInterface = createBaseCrudPage({
     ...resourceConfigs.myResource,
     customRenderField: (field) => { /* custom logic */ },
   });
   ```

## Examples

See the following files for examples:
- `products_custom.js` - Simple customization (hiding fields)
- `choferes_custom.js` - Advanced customization (custom table rows, validation)

## Benefits

✅ **Separation of concerns**: Each page can have its own logic
✅ **Maintainability**: Easier to modify individual pages without affecting others
✅ **Backward compatible**: Existing pages continue to work
✅ **Extensible**: Easy to add new hooks and customization points
✅ **DRY**: Shared logic remains in baseCrud.js

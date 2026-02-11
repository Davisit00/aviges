/**
 * Custom Choferes Page Implementation
 * This demonstrates advanced customization options
 */
import { createBaseCrudPage, getDisplayLabel } from "./baseCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

/**
 * Choferes Interface with customizations:
 * - Custom table row rendering to show persona data prominently
 * - Can add chofer-specific business logic
 */
export const ChoferesInterface_Custom = createBaseCrudPage({
  ...resourceConfigs.choferes,
  
  // Custom table row rendering
  customTableRow: (item, fields, canEdit, canDelete) => {
    const persona = item.persona || {};
    const empresa = item.empresa_transporte || {};
    
    return `
      <td>${item.id || "—"}</td>
      <td><strong>${persona.nombre || ""} ${persona.apellido || ""}</strong></td>
      <td>${persona.cedula || "—"}</td>
      <td>${empresa.razon_social || "—"}</td>
      <td>
        ${canEdit ? `<button class="edit-btn" data-id="${item.id}">Editar</button>` : ""}
        ${canDelete ? `<button class="delete-btn" data-id="${item.id}">Eliminar</button>` : ""}
      </td>
    `;
  },
  
  // Custom validation before update
  beforeUpdate: async (data, id) => {
    // Example: Add business logic validation
    if (data.id_personas && !data.id_empresas_transportes) {
      throw new Error("Debe seleccionar una empresa de transporte");
    }
  },
});

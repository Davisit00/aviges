/**
 * Custom Products Page Implementation
 * This demonstrates how to extend the base CRUD with custom logic
 */
import { createBaseCrudPage } from "./baseCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

/**
 * Products Interface with customizations:
 * - Custom rendering for codigo field (hidden/auto-generated)
 * - Can add custom validation, hooks, or display logic here
 */
export const ProductsInterface = createBaseCrudPage({
  ...resourceConfigs.productos,
  
  // Custom field rendering
  customRenderField: (field, resource) => {
    // Hide codigo field since it's auto-generated
    if (field.name === "codigo") {
      return ""; // Return empty string to hide
    }
    return null; // Return null to use default rendering
  },
  
  // Hook before creating a product
  beforeCreate: async (data) => {
    // Add any custom validation or data transformation here
    console.log("Creating product:", data);
  },
  
  // Hook after creating a product
  afterCreate: async (data) => {
    console.log("Product created successfully");
  },
});

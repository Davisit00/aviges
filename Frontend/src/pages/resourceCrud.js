/**
 * DEPRECATED: This file maintains backward compatibility
 * New pages should import from baseCrud.js or create custom implementations
 */
import { createBaseCrudPage } from "./baseCrud.js";

/**
 * Legacy export for backward compatibility
 * This simply wraps the base CRUD page without customizations
 */
export const createCrudPage = (config) => {
  return createBaseCrudPage(config);
};

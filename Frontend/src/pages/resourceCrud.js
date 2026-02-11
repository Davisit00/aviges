/**
 * Resource CRUD Page Creator
 * 
 * DEPRECATED: This monolithic approach has been replaced with self-contained modules.
 * 
 * For NEW pages, copy productos_example.js and customize it for your resource.
 * See README_CRUD.md for complete documentation.
 * 
 * This wrapper exists only for backward compatibility with existing pages.
 * Migrate to the new approach when you need to customize a page.
 */

import { API_BASE_URL, getAuthHeaders, listResource, createResource, updateResource, deleteResource } from '../api.js';
import { showMessage, showConfirm } from '../utils.js';
import { checkPermission } from './core.js';

/**
 * Creates a basic CRUD page (minimal implementation for compatibility)
 * @deprecated Copy productos_example.js for new pages
 */
export function createCrudPage(config) {
    console.warn(`DEPRECATED: ${config.resource} page using old createCrudPage. Consider migrating to self-contained module. See README_CRUD.md`);
    
    // Minimal implementation for backward compatibility
    // For full features, migrate to the new approach
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="crud-container">
            <h2>${config.displayName || config.resource}</h2>
            <p>Esta página usa la arquitectura antigua. Ver README_CRUD.md para migrar.</p>
            <p>Resource: ${config.resource}</p>
        </div>
    `;
    
    return container;
}

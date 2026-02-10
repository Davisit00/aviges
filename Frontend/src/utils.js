// No se usa

export const API_URL = "http://127.0.0.1:5000/api/";

export const ENDPOINTS = {
  LOGIN: API_URL + "auth/login",
  REGISTER: API_URL + "auth/register",
  AUTH: API_URL + "usuarios",
  PRODUCTOS: API_URL + "productos",
  EMPRESAS_TRANSPORTE: API_URL + "empresas_transporte",
  GRANJAS: API_URL + "granjas",
  PRODUCTOS: API_URL + "productos",
  GALPONES: API_URL + "galpones",
  VEHICULOS: API_URL + "vehiculos",
  CHOFERES: API_URL + "choferes",
  TICKETS_PESAJE: API_URL + "tickets_pesaje",
  DETALLES_TRANSPORTE_AVES: API_URL + "detalles_transporte_aves",
};

/**
 * Shows an admin credential validation modal
 * Returns a Promise that resolves with true if admin credentials are valid, false otherwise
 */
export function showAdminCredentialModal() {
  return new Promise((resolve) => {
    // Create modal HTML
    const modalHtml = `
      <div id="admin-credential-modal" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:2000; align-items:center; justify-content:center;">
        <div style="background:white; padding:30px; border-radius:12px; width:400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
          <h3 style="margin-top:0; color:#333; font-size:1.4em;">Autenticación Requerida</h3>
          <p style="color:#666; margin-bottom:20px;">Para realizar esta acción, necesita las credenciales de un administrador.</p>
          
          <div style="margin-bottom:15px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; color:#555;">Usuario Admin:</label>
            <input type="text" id="admin-usuario-input" placeholder="Ingrese usuario admin" 
              style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:1em;" autocomplete="username">
          </div>
          
          <div style="margin-bottom:20px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; color:#555;">Contraseña Admin:</label>
            <input type="password" id="admin-password-input" placeholder="Ingrese contraseña" 
              style="width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:1em;" autocomplete="current-password">
          </div>
          
          <div id="admin-error-msg" style="color:#d32f2f; margin-bottom:15px; display:none; padding:10px; background:#ffebee; border-radius:6px; font-size:0.9em;"></div>
          
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button id="admin-cancel-btn" style="padding:10px 20px; background:#757575; color:white; border:none; border-radius:6px; cursor:pointer; font-size:1em;">Cancelar</button>
            <button id="admin-validate-btn" style="padding:10px 20px; background:#2196F3; color:white; border:none; border-radius:6px; cursor:pointer; font-size:1em;">Validar</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);

    const modal = document.getElementById('admin-credential-modal');
    const usuarioInput = document.getElementById('admin-usuario-input');
    const passwordInput = document.getElementById('admin-password-input');
    const errorMsg = document.getElementById('admin-error-msg');
    const validateBtn = document.getElementById('admin-validate-btn');
    const cancelBtn = document.getElementById('admin-cancel-btn');

    // Focus on first input
    setTimeout(() => usuarioInput.focus(), 100);

    // Handle Enter key
    const handleEnter = (e) => {
      if (e.key === 'Enter') {
        validateBtn.click();
      }
    };
    usuarioInput.addEventListener('keypress', handleEnter);
    passwordInput.addEventListener('keypress', handleEnter);

    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });

    // Handle validation
    validateBtn.addEventListener('click', async () => {
      const usuario = usuarioInput.value.trim();
      const contrasena = passwordInput.value;

      if (!usuario || !contrasena) {
        errorMsg.textContent = 'Por favor ingrese usuario y contraseña';
        errorMsg.style.display = 'block';
        return;
      }

      validateBtn.disabled = true;
      validateBtn.textContent = 'Validando...';

      try {
        // Import api dynamically to avoid circular dependencies
        const { validateAdminCredentials } = await import('./api.js');
        const response = await validateAdminCredentials({ usuario, contrasena });

        if (response.data.valid && response.data.is_admin) {
          modal.remove();
          resolve(true);
        } else {
          errorMsg.textContent = response.data.error || 'Las credenciales no corresponden a un administrador';
          errorMsg.style.display = 'block';
          validateBtn.disabled = false;
          validateBtn.textContent = 'Validar';
          passwordInput.value = '';
          passwordInput.focus();
        }
      } catch (error) {
        errorMsg.textContent = 'Error al validar credenciales. Intente nuevamente.';
        errorMsg.style.display = 'block';
        validateBtn.disabled = false;
        validateBtn.textContent = 'Validar';
        console.error('Error validating admin credentials:', error);
      }
    });
  });
}

/*## 🔗 Endpoints CRUD

- **Listar**: `GET /api/<resource>?page=1&per_page=20`
- **Obtener**: `GET /api/<resource>/<id>`
- **Crear**: `POST /api/<resource>`
- **Actualizar**: `PUT/PATCH /api/<resource>/<id>`
- **Eliminar**: `DELETE /api/<resource>/<id>`

*/

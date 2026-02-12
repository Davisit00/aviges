export class Modal {
  constructor() {
    this.overlay = null;
    this.container = null;
    this.headerTitle = null;
    this.bodyContent = null;
    this.init();
  }

  init() {
    // Verificar si ya existe en el DOM para no duplicar
    if (document.querySelector(".modal-overlay")) {
      this.overlay = document.querySelector(".modal-overlay");
      this.container = this.overlay.querySelector(".modal-container");
      this.headerTitle = this.overlay.querySelector("h3");
      this.bodyContent = this.overlay.querySelector(".modal-body");
      return;
    }

    // Crear estructura HTML
    this.overlay = document.createElement("div");
    this.overlay.className = "modal-overlay";

    this.overlay.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h3>Título</h3>
                    <button class="close-modal-btn">&times;</button>
                </div>
                <div class="modal-body"></div>
            </div>
        `;

    document.body.appendChild(this.overlay);

    // Referencias
    this.container = this.overlay.querySelector(".modal-container");
    this.headerTitle = this.overlay.querySelector("h3");
    this.bodyContent = this.overlay.querySelector(".modal-body");

    // Eventos de cierre
    this.overlay.querySelector(".close-modal-btn").onclick = () => this.hide();

    // Cerrar al hacer clic fuera del contenido (overlay)
    this.overlay.onclick = (e) => {
      if (e.target === this.overlay) this.hide();
    };
  }

  /**
   * Muestra el modal con el contenido especificado
   * @param {string} title - Título del modal
   * @param {string} htmlContent - HTML del formulario o contenido
   * @param {Function} onLoad - Callback opcional cuando el HTML se ha renderizado (para agregar listeners)
   */
  show(title, htmlContent, onLoad = null) {
    this.headerTitle.innerText = title;
    this.bodyContent.innerHTML = htmlContent;
    this.overlay.classList.add("active");

    if (onLoad && typeof onLoad === "function") {
      // Pequeño timeout para asegurar renderizado
      setTimeout(() => onLoad(this.bodyContent), 0);
    }
  }

  hide() {
    this.overlay.classList.remove("active");
    this.bodyContent.innerHTML = ""; // Limpiar para evitar duplicados de IDs
  }
}

// Exportamos una instancia única (Singleton) para usarla en toda la app
export const modal = new Modal();

import { logout, getUserInfo } from "../api.js";
import { init as initProductos } from "./productos.js";
import { init as initUsuarios } from "./usuarios.js";
import { init as initEmpresas } from "./empresasTransporte.js";
import { init as initGranjas } from "./granjas.js";
import { init as initGalpones } from "./galpones.js";
import { init as initVehiculos } from "./vehiculos.js";
import { init as initChoferes } from "./choferes.js";
import { init as initLotes } from "./lotes.js";
import { init as initWelcome } from "./welcome.js";
import { init as initUbicaciones } from "./ubicaciones.js"; // IMPORTA EL NUEVO ARCHIVO
import { init as initTickets } from "./ticketsPesaje.js"; // IMPORTA EL NUEVO ARCHIVO

// Constante para la clave del storage
const STORAGE_KEY_VIEW = "aviges_active_view";

// Mapa de vistas disponibles
const VIEW_MAP = {
  welcome: initWelcome,
  productos: initProductos,
  usuarios: initUsuarios,
  empresas: initEmpresas,
  granjas: initGranjas,
  galpones: initGalpones,
  vehiculos: initVehiculos,
  choferes: initChoferes,
  lotes: initLotes,
  ubicaciones: initUbicaciones, // REGISTRAR AQUI
  tickets: initTickets, // REGISTRAR AQUI
};

let currentUserRole = null;

// Helper para limpiar y montar vista
async function mount(initFunction, containerId = "content-container") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<div class="loading">Cargando módulo...</div>';

  try {
    await initFunction(container);
  } catch (err) {
    console.error("Error montando módulo:", err);
    container.innerHTML = `<div class="error">Error cargando el módulo: ${err.message}</div>`;
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  // Referencias DOM
  const btnProductos = document.getElementById("products-button");
  const btnVehiculos = document.getElementById("vehicles-button");
  const btnChoferes = document.getElementById("drivers-button");
  const btnEmpresas = document.getElementById("transport-companies-button");
  const btnGranjas = document.getElementById("farms-button");
  const btnGalpones = document.getElementById("barns-button");
  const btnUsuarios = document.getElementById("users-button");
  const btnLotes = document.getElementById("lot-button");
  const btnUbicaciones = document.getElementById("ubicaciones-button"); // NUEVO BOTON
  const btnWeighs = document.getElementById("weigh-button"); // NUEVO BOTON
  const btnLogout = document.getElementById("logout-button");

  // Elemento Logo/Título
  const logoContainer = document.querySelector(".title-container");

  // -- Función de Navegación con Persistencia --
  const navigate = (viewKey) => {
    // Protección adicional para Usuarios
    if (viewKey === "usuarios" && currentUserRole !== 1) {
      alert("Acceso denegado");
      return;
    }

    if (VIEW_MAP[viewKey]) {
      // Guardamos en localstorage
      localStorage.setItem(STORAGE_KEY_VIEW, viewKey);
      mount(VIEW_MAP[viewKey]);
    } else {
      console.warn("Vista no encontrada:", viewKey);
    }
  };

  // Cargar Info Usuario
  try {
    const res = await getUserInfo();
    const user = res.data;
    currentUserRole = user.rol.id || user.user_rol; // Ajuste backend
    console.log("Usuario:", user.usuario, "Rol ID:", currentUserRole);

    if (currentUserRole !== 1 && btnUsuarios) {
      btnUsuarios.parentElement.style.display = "none";
    }

    // --- Lógica de recuperación de pestaña ---
    // Leemos la última vista, si no existe o es inválida, usamos 'welcome'
    let lastView = localStorage.getItem(STORAGE_KEY_VIEW) || "welcome";

    // Si intentan cargar 'usuarios' directo desde storage y no son admin, forzar 'welcome'
    if (lastView === "usuarios" && currentUserRole !== 1) {
      lastView = "welcome";
    }

    // Cargar la vista inicial
    if (VIEW_MAP[lastView]) {
      mount(VIEW_MAP[lastView]);
    } else {
      mount(initWelcome);
    }
  } catch (error) {
    console.error("Error obteniendo info del usuario", error);
    // En caso de error de token, redirigir
    // window.location.href = "../../index.html";
  }

  // --- Event Listeners Menú Actualizados ---
  // Ahora usan la función navigate(key)
  if (btnProductos) btnProductos.onclick = () => navigate("productos");
  if (btnVehiculos) btnVehiculos.onclick = () => navigate("vehiculos");
  if (btnChoferes) btnChoferes.onclick = () => navigate("choferes");
  if (btnEmpresas) btnEmpresas.onclick = () => navigate("empresas");
  if (btnGranjas) btnGranjas.onclick = () => navigate("granjas");
  if (btnGalpones) btnGalpones.onclick = () => navigate("galpones");
  if (btnLotes) btnLotes.onclick = () => navigate("lotes");
  if (btnUbicaciones) btnUbicaciones.onclick = () => navigate("ubicaciones"); // CONECTAR
  if (btnWeighs) btnWeighs.onclick = () => navigate("tickets"); // CONECTAR

  // NUEVO: Click en el logo carga 'welcome'
  if (logoContainer) {
    logoContainer.style.cursor = "pointer";
    logoContainer.onclick = () => navigate("welcome");
  }

  if (btnUsuarios) {
    btnUsuarios.onclick = () => {
      if (currentUserRole === 1) mount(initUsuarios);
      else alert("Acceso denegado");
    };
  }

  if (btnLogout) {
    btnLogout.onclick = () => {
      STORAGE_KEY_VIEW && localStorage.removeItem(STORAGE_KEY_VIEW);
      logout();
      window.location.href = "../../index.html";
    };
  }

  // --- Lógica Menú Colapsable ---
  const toggleMenuButton = document.getElementById("toggle-menu-button");
  const mainMenu = document.querySelector(".main-menu");

  if (toggleMenuButton && mainMenu) {
    toggleMenuButton.addEventListener("click", (e) => {
      e.stopPropagation(); // <--- AGREGAR ESTO: Detiene el evento aquí y evita que suba al title-container

      mainMenu.classList.toggle("collapsed");
      const logoImage = document.querySelector(".logo");
      const isCollapsed = mainMenu.classList.contains("collapsed");

      // 1. Alternar visibilidad de textos e iconos
      mainMenu
        .querySelectorAll(".menu-text, .arrow-icon, h2")
        .forEach((el) => (el.style.display = isCollapsed ? "none" : ""));

      mainMenu
        .querySelectorAll(".collapsed-icon")
        .forEach((el) => (el.style.display = isCollapsed ? "block" : "none"));

      // 2. Controlar Logo
      if (logoImage) {
        // Ajusta según tu preferencia visual o elimina si usas CSS para esto
        logoImage.style.width = isCollapsed ? "40px" : "150px";
        logoImage.style.height = isCollapsed ? "40px" : "150px";
      }

      // 3. Cerrar TODAS las listas desplegadas y resetear flechas si se colapsa
      if (isCollapsed) {
        // Remover clase show-menu de las listas
        document
          .querySelectorAll(
            "#maintenance-menu-list, #process-menu-list, #reports-menu-list",
          )
          .forEach((ul) => ul.classList.remove("show-menu"));

        // Remover rotación de las flechas
        document
          .querySelectorAll(".arrow-icon")
          .forEach((icon) => icon.classList.remove("rotated"));
      }
    });
  }

  // Manejo de Submenús (Mantenimiento, Procesos, Reportes)
  setupSubmenu("maintenance-deploy-button", "maintenance-menu-list");
  setupSubmenu("process-deploy-button", "process-menu-list");
  setupSubmenu("reports-deploy-button", "reports-menu-list");

  function setupSubmenu(btnId, listId) {
    const btn = document.getElementById(btnId);
    const list = document.getElementById(listId);
    if (btn && list) {
      btn.addEventListener("click", () => {
        if (mainMenu.classList.contains("collapsed")) toggleMenuButton.click();
        list.classList.toggle("show-menu");
        const icon = btn.querySelector(".arrow-icon");
        if (icon) icon.classList.toggle("rotated");
      });
    }
  }
});

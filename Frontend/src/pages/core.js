import { logout, getUserInfo } from "../api.js"; // Asegurar importación de getUserInfo
import { WelcomeInterface } from "./welcome.js";

// Variable global para almacenar el rol del usuario
let currentUserRole = null;

// ** NEW PERMISSION LOGIC **
const getPermissions = (resource) => {
  // Admin (Role 1): Full CRUD on everything
  if (currentUserRole === 1) {
    return {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      requiresAdminForEdit: false,
    };
  }

  // Romanero (Role 2): Complex permission matrix
  if (currentUserRole === 2) {
    // CR only: Asignaciones, Ubicaciones, Granjas, Galpones, Lotes
    const crOnlyResources = [
      "asignaciones",
      "ubicaciones",
      "granjas",
      "galpones",
      "lotes",
    ];
    if (crOnlyResources.includes(resource)) {
      return {
        canCreate: true,
        canEdit: false,
        canDelete: false,
        requiresAdminForEdit: false,
      };
    }

    // Update with admin credentials: Direcciones, Personas, Telefonos, Productos,
    // EmpresasTransporte, Vehiculos, Choferes, Viajes, RIF
    const adminCredentialResources = [
      "direcciones",
      "personas",
      "telefonos",
      "productos",
      "rif",
      "empresas_transporte",
      "vehiculos",
      "choferes",
      "viajes_tiempos",
      "viajes_conteos",
      "viajes_origen",
    ];
    if (adminCredentialResources.includes(resource)) {
      return {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        requiresAdminForEdit: true,
      };
    }

    // TicketPesaje: Special case - can edit if not finalized
    if (resource === "tickets_pesaje") {
      return {
        canCreate: true,
        canEdit: true, // Will check finalized status before edit
        canDelete: false,
        requiresAdminForEdit: false, // Will require if finalized
        specialEditCheck: "ticket_finalized",
      };
    }

    // Estadisticas: Read-only
    if (resource === "estadisticas") {
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        readOnly: true,
      };
    }

    // Roles, Usuarios: No access
    if (resource === "roles" || resource === "usuarios") {
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        noAccess: true,
      };
    }
  }

  // Default: No access
  return {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    readOnly: true,
  };
};

function render(template, node) {
  if (!node) return;
  node.innerHTML = template;
}

// Lógica para inicializar permisos y rotar iconos
window.addEventListener("DOMContentLoaded", async () => {
  // Get references to all buttons
  const productsButton = document.getElementById("products-button");
  const vehiclesButton = document.getElementById("vehicles-button");
  const driversButton = document.getElementById("drivers-button");
  const transportCompaniesButton = document.getElementById(
    "transport-companies-button",
  );
  const farmsButton = document.getElementById("farms-button");
  const barnsButton = document.getElementById("barns-button");
  const usersButton = document.getElementById("users-button");
  const ticketsButton = document.getElementById("tickets-button");
  const avesDetailsButton = document.getElementById("aves-details-button");
  const logoutButton = document.getElementById("logout-button");
  const weighButton = document.getElementById("weigh-button");
  const ticketPrintButton = document.getElementById("ticket-print-button");
  const relacionPesajeButton = document.getElementById(
    "weigh-relationship-button",
  );

  // NEW: Renderizar página de Bienvenida por defecto
  const appContainer = document.getElementById("content-container");
  if (appContainer) {
    render(WelcomeInterface.template, appContainer);
    WelcomeInterface.setup();
  }

  // NEW: Toggle Menu Button Logic
  const toggleMenuButton = document.getElementById("toggle-menu-button");
  const mainMenu = document.querySelector(".main-menu");
  const contentContainer = document.getElementById("content-container");

  if (toggleMenuButton) {
    toggleMenuButton.addEventListener("click", () => {
      mainMenu.classList.toggle("collapsed");

      // Referencias a elementos que cambian de visibilidad
      const logoImage = document.getElementById("logo-image");
      const subMenus = document.querySelectorAll(".lists-container ul");

      if (mainMenu.classList.contains("collapsed")) {
        // MODO COLAPSADO

        // Ocultar texto, flechas, título y logo
        mainMenu
          .querySelectorAll(".menu-text, .arrow-icon, h2")
          .forEach((el) => (el.style.display = "none"));
        if (logoImage) logoImage.style.display = "none";

        // Cerrar submenús abiertos para evitar desbordamiento visual
        subMenus.forEach((ul) => ul.classList.remove("show-menu"));
        mainMenu
          .querySelectorAll(".arrow-icon.rotated")
          .forEach((icon) => icon.classList.remove("rotated"));

        // Mostrar iconos colapsados
        mainMenu
          .querySelectorAll(".collapsed-icon")
          .forEach((el) => (el.style.display = "block"));
      } else {
        // MODO EXPANDIDO
        mainMenu.style.width = ""; // Reset to CSS default

        // Mostrar texto, flechas, título y logo
        mainMenu
          .querySelectorAll(".menu-text, .arrow-icon, h2")
          .forEach((el) => (el.style.display = ""));
        if (logoImage) logoImage.style.display = "";

        // Ocultar iconos colapsados
        mainMenu
          .querySelectorAll(".collapsed-icon")
          .forEach((el) => (el.style.display = "none"));
      }
    });
  }

  // INICIO FUNCIONALIDAD MENUS DESPLEGABLES
  // Get references to deploy buttons and menus
  const maintenanceDeployButton = document.getElementById(
    "maintenance-deploy-button",
  );
  const processDeployButton = document.getElementById("process-deploy-button");
  const reportsDeployButton = document.getElementById("reports-deploy-button");

  const maintenanceMenuList = document.getElementById("maintenance-menu-list");
  const processMenuList = document.getElementById("process-menu-list");
  const reportsMenuList = document.getElementById("reports-menu-list");

  // Add event listeners for menu toggling and icon rotation
  // Configuro esto ANTES de la llamada a la API para que el menú funcione visualmente de inmediato
  if (maintenanceDeployButton) {
    maintenanceDeployButton.addEventListener("click", () => {
      // Si está colapsado, lo abrimos al hacer click en una categoría
      if (mainMenu.classList.contains("collapsed")) {
        // Trigger click to expand
        toggleMenuButton.click();
      }

      maintenanceMenuList.classList.toggle("show-menu");
      const icon = maintenanceDeployButton.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }

  if (processDeployButton) {
    processDeployButton.addEventListener("click", () => {
      // Si está colapsado, lo abrimos al hacer click en una categoría
      if (mainMenu.classList.contains("collapsed")) {
        toggleMenuButton.click();
      }

      processMenuList.classList.toggle("show-menu");
      const icon = processDeployButton.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }

  if (reportsDeployButton) {
    reportsDeployButton.addEventListener("click", () => {
      // Si está colapsado, lo abrimos al hacer click en una categoría
      if (mainMenu.classList.contains("collapsed")) {
        toggleMenuButton.click();
      }

      reportsMenuList.classList.toggle("show-menu");
      const icon = reportsDeployButton.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }
  // FIN FUNCIONALIDAD MENUS DESPLEGABLES

  // Add event listeners for all menu buttons
  productsButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(ProductsInterface.template, app);
    ProductsInterface.setup(getPermissions("productos"));
  });

  vehiclesButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(VehiculosInterface.template, app);
    VehiculosInterface.setup(getPermissions("vehiculos"));
  });

  driversButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(ChoferesInterface.template, app);
    ChoferesInterface.setup(getPermissions("choferes"));
  });

  transportCompaniesButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(EmpresasTransporteInterface.template, app);
    EmpresasTransporteInterface.setup(getPermissions("empresas_transporte"));
  });

  farmsButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(GranjasInterface.template, app);
    GranjasInterface.setup(getPermissions("granjas"));
  });

  barnsButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(GalponesInterface.template, app);
    GalponesInterface.setup(getPermissions("galpones"));
  });

  usersButton.addEventListener("click", () => {
    // Doble seguridad: si no es admin, no renderiza nada
    if (currentUserRole !== 1) return;

    const app = document.getElementById("content-container");
    render(UsuariosInterface.template, app);
    // Usuarios siempre full permissions porque solo entra admin
    UsuariosInterface.setup({
      canCreate: true,
      canEdit: true,
      canDelete: true,
    });
  });

  weighButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(TicketsPesajeInterface.template, app);
    TicketsPesajeInterface.setup(getPermissions("tickets_pesaje"));
  });

  logoutButton.addEventListener("click", () => {
    logout();
    window.location.href = "../../index.html";
    alert("Has cerrado sesión.");
  });

  ticketPrintButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(TicketsPesajePrintInterface.template, app);
    TicketsPesajePrintInterface.setup();
  });

  ticketsButton.addEventListener("click", () => {
    const app = document.getElementById("content-container");
    render(TicketsPesajeCrudInterface.template, app);
    TicketsPesajeCrudInterface.setup(getPermissions("tickets_pesaje"));
  });

  // 1. Obtener información del usuario y Rol
  try {
    const res = await getUserInfo();
    const user = res.data;
    currentUserRole = user.id_roles || user.user_rol;

    // Si NO es rol 1 (Admin), ocultar botón de gestión de Usuarios
    if (currentUserRole !== 1) {
      if (usersButton) {
        // Ocultamos el elemento <li> padre para que desaparezca de la lista
        usersButton.parentElement.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Error obteniendo info del usuario", error);
    // Opcional: Redirigir si falla la autenticación crítica
  }
});

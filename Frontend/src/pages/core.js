import { logout, getUserInfo } from "../api.js"; // Asegurar importación de getUserInfo
import { ProductsInterface } from "./products.js";
import { UsuariosInterface } from "./usuarios.js";
import { EmpresasTransporteInterface } from "./empresasTransporte.js";
import { GranjasInterface } from "./granjas.js";
import { GalponesInterface } from "./galpones.js";
import { VehiculosInterface } from "./vehiculos.js";
import { ChoferesInterface } from "./choferes.js";
import { TicketsPesajeInterface } from "./ticketsPesaje.js";
import { DetallesTransporteAvesInterface } from "./detallesTransporteAves.js";
import { TicketsPesajePrintInterface } from "./ticketsPesajePrint.js";
import { TicketsPesajeCrudInterface } from "./ticketsPesajeCrud.js";

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
// INICIO FUNCIONALIDAD MENUS DESPLEGABLES
const maintenanceDeployButton = document.getElementById(
  "maintenance-deploy-button",
);
const processDeployButton = document.getElementById("process-deploy-button");
const reportsDeployButton = document.getElementById("reports-deploy-button");

const maintenanceMenuList = document.getElementById("maintenance-menu-list");
const processMenuList = document.getElementById("process-menu-list");
const reportsMenuList = document.getElementById("reports-menu-list");

maintenanceDeployButton.addEventListener("click", () => {
  maintenanceMenuList.classList.toggle("show-menu");
});

processDeployButton.addEventListener("click", () => {
  processMenuList.classList.toggle("show-menu");
});

reportsDeployButton.addEventListener("click", () => {
  reportsMenuList.classList.toggle("show-menu");
});

// Variable global para almacenar el rol del usuario
let currentUserRole = null;

// Lógica para inicializar permisos y rotar iconos
window.addEventListener("DOMContentLoaded", async () => {
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

  // Lógica para rotar el icono del menú
  const btn1 = document.getElementById("maintenance-deploy-button");
  if (btn1) {
    btn1.addEventListener("click", () => {
      const icon = btn1.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }
  const btn2 = document.getElementById("process-deploy-button");
  if (btn2) {
    btn2.addEventListener("click", () => {
      const icon = btn2.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }
  const btn3 = document.getElementById("reports-deploy-button");
  if (btn3) {
    btn3.addEventListener("click", () => {
      const icon = btn3.querySelector(".arrow-icon");
      if (icon) icon.classList.toggle("rotated");
    });
  }
});
// FIN FUNCIONALIDAD MENUS DESPLEGABLES

function render(template, node) {
  if (!node) return;
  node.innerHTML = template;
}

// Helper para determinar si es solo lectura (Rol != 1)
// Mantenimiento es ReadOnly para no admins.
const isMaintenanceReadOnly = () => currentUserRole !== 1;

// ** LOGIC FOR PERMISSIONS **
const getPermissions = (moduleType) => {
  // Si es Usuario Admin (1), tiene acceso total
  if (currentUserRole === 1) {
    return { canCreate: true, canEdit: true, canDelete: true };
  }

  // Si es Usuario Estándar (2)
  if (currentUserRole === 2) {
    if (moduleType === "maintenance") {
      // Mantenimiento solo lectura
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        readOnly: true,
      };
    }
    if (moduleType === "process") {
      // Procesos (Tickets/Aves): Puede crear, PERO NO editar ni eliminar
      return { canCreate: true, canEdit: false, canDelete: false };
    }
  }

  // Default safe fallback
  return { canCreate: false, canEdit: false, canDelete: false, readOnly: true };
};

productsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(ProductsInterface.template, app);
  ProductsInterface.setup(getPermissions("maintenance"));
});

vehiclesButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(VehiculosInterface.template, app);
  VehiculosInterface.setup(getPermissions("maintenance"));
});

driversButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(ChoferesInterface.template, app);
  ChoferesInterface.setup(getPermissions("maintenance"));
});

transportCompaniesButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(EmpresasTransporteInterface.template, app);
  EmpresasTransporteInterface.setup(getPermissions("maintenance"));
});

farmsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(GranjasInterface.template, app);
  GranjasInterface.setup(getPermissions("maintenance"));
});

barnsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(GalponesInterface.template, app);
  GalponesInterface.setup(getPermissions("maintenance"));
});

usersButton.addEventListener("click", () => {
  // Doble seguridad: si no es admin, no renderiza nada
  if (currentUserRole !== 1) return;

  const app = document.getElementById("content-container");
  render(UsuariosInterface.template, app);
  // Usuarios siempre full permissions porque solo entra admin
  UsuariosInterface.setup({ canCreate: true, canEdit: true, canDelete: true });
});

weighButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(TicketsPesajeInterface.template, app);
  // Tickets usa permisos de 'process'
  TicketsPesajeInterface.setup(getPermissions("process"));
});

avesDetailsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(DetallesTransporteAvesInterface.template, app);
  // Detalles Aves usa permisos de 'process'
  DetallesTransporteAvesInterface.setup(getPermissions("process"));
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
  TicketsPesajeCrudInterface.setup(getPermissions("process"));
});

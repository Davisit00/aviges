import { logout } from "../api.js";
import { ProductsInterface } from "./products.js";
import { UsuariosInterface } from "./usuarios.js";
import { EmpresasTransporteInterface } from "./empresasTransporte.js";
import { GranjasInterface } from "./granjas.js";
import { GalponesInterface } from "./galpones.js";
import { VehiculosInterface } from "./vehiculos.js";
import { ChoferesInterface } from "./choferes.js";
import { TicketsPesajeInterface } from "./ticketsPesaje.js";
import { DetallesTransporteAvesInterface } from "./detallesTransporteAves.js";

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

// Lógica para rotar el icono del menú
window.addEventListener("DOMContentLoaded", () => {
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

productsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(ProductsInterface.template, app);
  ProductsInterface.setup();
});

vehiclesButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(VehiculosInterface.template, app);
  VehiculosInterface.setup();
});

driversButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(ChoferesInterface.template, app);
  ChoferesInterface.setup();
});

transportCompaniesButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(EmpresasTransporteInterface.template, app);
  EmpresasTransporteInterface.setup();
});

farmsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(GranjasInterface.template, app);
  GranjasInterface.setup();
});

barnsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(GalponesInterface.template, app);
  GalponesInterface.setup();
});

usersButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(UsuariosInterface.template, app);
  UsuariosInterface.setup();
});

weighButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(TicketsPesajeInterface.template, app);
  TicketsPesajeInterface.setup();
});

avesDetailsButton.addEventListener("click", () => {
  const app = document.getElementById("content-container");
  render(DetallesTransporteAvesInterface.template, app);
  DetallesTransporteAvesInterface.setup();
});

logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../../index.html";
  alert("Has cerrado sesión.");
});

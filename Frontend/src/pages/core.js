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

ticketsButton.addEventListener("click", () => {
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

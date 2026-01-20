import { logout } from "../api.js";
import { ProductsInterface } from "./products.js";

const productsButton = document.getElementById("products-button");
const vehiclesButton = document.getElementById("vehicles-button");
const driversButton = document.getElementById("drivers-button");
const transportCompaniesButton = document.getElementById(
  "transport-companies-button",
);
const farmsButton = document.getElementById("farms-button");
const barnsButton = document.getElementById("barns-button");
const usersButton = document.getElementById("users-button");
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

logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
  alert("Has cerrado sesión.");
});

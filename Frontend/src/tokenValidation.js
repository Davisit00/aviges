import { validateToken } from "./api.js";

export function validateAndRedirect() {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementsByTagName("body")[0].style.display = "none";
    validateToken()
      .then((response) => {
        document.getElementsByTagName("body")[0].style.display = "flex";
        console.log("Token is valid:", response.data);
      })
      .catch((error) => {
        console.error("Token validation failed:", error);
        window.location.href = "../index.html";
        alert("Session expired. Please log in again.");
      });
  });
}

export function haveToken() {
  const token = localStorage.getItem("access_token");
  return !!token;
}

import { login } from "./src/api.js";
import { haveToken } from "./src/tokenValidation.js";

// Redirige a la página principal si ya hay un token válido
haveToken().then((valid) => {
  if (valid) {
    window.location.href = "src/pages/core.html";
  }
});

function LoginHandler(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const payload = {
    nombre_usuario: username,
    contrasena: password,
  };
  login(payload)
    .then((response) => {
      const { access_token } = response.data;
      localStorage.setItem("access_token", access_token);
      alert("Login successful!");
      window.location.href = "src/pages/core.html";
    })
    .catch((error) => {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
    });
}

document.getElementById("login-button").addEventListener("click", LoginHandler);

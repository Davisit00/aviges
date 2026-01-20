export const ProductsInterface = {
  template: `
    <h2>Gestión de Productos</h2>
    <div>
      <button id="load-products-btn">Cargar Productos</button>
        <ul id="products-list"></ul>
    </div>
  `,
  setup() {
    document
      .getElementById("load-products-btn")
      .addEventListener("click", () => {
        // Lógica para cargar y mostrar productos
        alert("Cargando productos...");
      });
  },
};

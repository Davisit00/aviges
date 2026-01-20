import { createCrudPage } from "./resourceCrud.js";

export const ProductsInterface = createCrudPage({
  title: "Gestión de Productos",
  resource: "productos",
  fields: [
    { name: "codigo", label: "Código" },
    { name: "nombre", label: "Nombre" },
    { name: "es_ave_viva", label: "Ave Viva", type: "checkbox" },
  ],
});

import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const ProductsInterface = createCrudPage(resourceConfigs.productos);

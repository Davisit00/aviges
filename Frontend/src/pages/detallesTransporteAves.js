import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const DetallesTransporteAvesInterface = createCrudPage(
  resourceConfigs.detalles_transporte_aves,
);

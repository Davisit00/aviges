import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const EmpresasTransporteInterface = createCrudPage(
  resourceConfigs.empresas_transporte,
);

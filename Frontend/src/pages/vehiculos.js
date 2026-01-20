import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const VehiculosInterface = createCrudPage(resourceConfigs.vehiculos);

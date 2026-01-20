import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const UsuariosInterface = createCrudPage(resourceConfigs.usuarios);

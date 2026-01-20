import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const TicketsPesajeInterface = createCrudPage(
  resourceConfigs.tickets_pesaje,
);

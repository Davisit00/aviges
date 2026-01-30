import { createPrintPage } from "./resourcePrint.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const TicketsPesajePrintInterface = createPrintPage(
  resourceConfigs.tickets_pesaje,
);

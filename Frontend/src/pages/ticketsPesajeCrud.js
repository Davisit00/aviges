import { createCrudPage } from "./resourceCrud.js";
import { resourceConfigs } from "./resourceConfigs.js";

export const TicketsPesajeCrudInterface = {
  ...createCrudPage(resourceConfigs.tickets_pesaje),
  setup(permissions = {}) {
    return createCrudPage(resourceConfigs.tickets_pesaje).setup({
      ...permissions,
      canCreate: false,
    });
  },
};

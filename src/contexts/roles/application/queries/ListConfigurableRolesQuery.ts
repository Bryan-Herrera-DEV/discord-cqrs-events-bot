import type { Query } from "@shared/application/QueryBus";

import type { RoleListItem } from "@contexts/roles/application/ports/RoleManagementPort";

export interface ConfigurableRoleView extends RoleListItem {
  configurable: boolean;
}

export class ListConfigurableRolesQuery implements Query<ConfigurableRoleView[]> {
  public static readonly type = "roles.list-configurable";
  public readonly type = ListConfigurableRolesQuery.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

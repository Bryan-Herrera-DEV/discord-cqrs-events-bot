import type { QueryHandler } from "@shared/application/QueryBus";

import type { RoleConfigurationRepository } from "@contexts/roles/application/ports/RoleConfigurationRepository";
import type { RoleManagementPort } from "@contexts/roles/application/ports/RoleManagementPort";
import {
  ListConfigurableRolesQuery,
  type ConfigurableRoleView
} from "@contexts/roles/application/queries/ListConfigurableRolesQuery";

export class ListConfigurableRolesHandler
  implements QueryHandler<ListConfigurableRolesQuery, ConfigurableRoleView[]>
{
  public constructor(
    private readonly roleGateway: RoleManagementPort,
    private readonly configurationRepository: RoleConfigurationRepository
  ) {}

  public async handle(query: ListConfigurableRolesQuery): Promise<ConfigurableRoleView[]> {
    const [roles, configuration] = await Promise.all([
      this.roleGateway.listRoles(query.payload.guildId),
      this.configurationRepository.findByGuildId(query.payload.guildId)
    ]);
    const set = new Set(configuration?.configurableRoleIds ?? []);

    return roles.map((role) => ({
      ...role,
      configurable: set.size === 0 ? true : set.has(role.id)
    }));
  }
}

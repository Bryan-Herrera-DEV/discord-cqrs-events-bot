import type { DomainEventHandler } from "@shared/application/EventBus";
import type { DomainEvent } from "@shared/domain/DomainEvent";

import type { RoleConfigurationRepository } from "@contexts/roles/application/ports/RoleConfigurationRepository";

interface RoleDeletedPayload {
  guildId: string;
  roleId: string;
}

export class OnRoleDeletedHandler {
  public constructor(private readonly repository: RoleConfigurationRepository) {}

  public build(): DomainEventHandler<DomainEvent<RoleDeletedPayload>> {
    return async (event) => {
      await this.repository.removeRoleFromConfiguration(event.payload.guildId, event.payload.roleId);
    };
  }
}

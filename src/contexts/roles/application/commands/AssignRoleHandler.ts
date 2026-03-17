import type { CommandHandler } from "@shared/application/CommandBus";

import { RoleAssignmentPolicy } from "@contexts/roles/domain/RoleAssignmentPolicy";
import type { RoleConfigurationRepository } from "@contexts/roles/application/ports/RoleConfigurationRepository";
import type { RoleManagementPort } from "@contexts/roles/application/ports/RoleManagementPort";
import { AssignRoleCommand } from "@contexts/roles/application/commands/AssignRoleCommand";

export class AssignRoleHandler implements CommandHandler<AssignRoleCommand, void> {
  private readonly policy = new RoleAssignmentPolicy();

  public constructor(
    private readonly roleGateway: RoleManagementPort,
    private readonly roleConfigurationRepository: RoleConfigurationRepository
  ) {}

  public async handle(command: AssignRoleCommand): Promise<void> {
    const context = await this.roleGateway.getRoleContext(
      command.payload.guildId,
      command.payload.actorUserId,
      command.payload.targetUserId,
      command.payload.roleId
    );

    this.policy.assertRoleChangeAllowed(context);

    const configuration = await this.roleConfigurationRepository.findByGuildId(command.payload.guildId);
    if (
      configuration &&
      configuration.configurableRoleIds.length > 0 &&
      !configuration.configurableRoleIds.includes(command.payload.roleId)
    ) {
      throw new Error("Este rol no está marcado como configurable en esta guild");
    }

    await this.roleGateway.assignRole(
      command.payload.guildId,
      command.payload.targetUserId,
      command.payload.roleId,
      command.payload.reason
    );
  }
}

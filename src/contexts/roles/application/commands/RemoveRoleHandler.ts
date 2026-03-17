import type { CommandHandler } from "@shared/application/CommandBus";

import { RoleAssignmentPolicy } from "@contexts/roles/domain/RoleAssignmentPolicy";
import type { RoleManagementPort } from "@contexts/roles/application/ports/RoleManagementPort";
import { RemoveRoleCommand } from "@contexts/roles/application/commands/RemoveRoleCommand";

export class RemoveRoleHandler implements CommandHandler<RemoveRoleCommand, void> {
  private readonly policy = new RoleAssignmentPolicy();

  public constructor(private readonly roleGateway: RoleManagementPort) {}

  public async handle(command: RemoveRoleCommand): Promise<void> {
    const context = await this.roleGateway.getRoleContext(
      command.payload.guildId,
      command.payload.actorUserId,
      command.payload.targetUserId,
      command.payload.roleId
    );

    this.policy.assertRoleChangeAllowed(context);

    await this.roleGateway.removeRole(
      command.payload.guildId,
      command.payload.targetUserId,
      command.payload.roleId,
      command.payload.reason
    );
  }
}

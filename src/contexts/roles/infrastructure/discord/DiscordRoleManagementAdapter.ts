import type { RoleManagementPort, RoleContextSnapshot, RoleListItem } from "@contexts/roles/application/ports/RoleManagementPort";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

export class DiscordRoleManagementAdapter implements RoleManagementPort {
  public constructor(private readonly discord: DiscordGateway) {}

  public async getRoleContext(
    guildId: string,
    actorUserId: string,
    targetUserId: string,
    roleId: string
  ): Promise<RoleContextSnapshot> {
    const [actor, target, role, botHighestRolePosition] = await Promise.all([
      this.discord.getMemberHierarchy(guildId, actorUserId),
      this.discord.getMemberHierarchy(guildId, targetUserId),
      this.discord.getRoleHierarchy(guildId, roleId),
      this.discord.getBotHighestRolePosition(guildId)
    ]);

    return {
      actorHighestRolePosition: actor.highestRolePosition,
      targetHighestRolePosition: target.highestRolePosition,
      rolePosition: role.position,
      roleManagedByIntegration: role.managed,
      botHighestRolePosition
    };
  }

  public async assignRole(
    guildId: string,
    targetUserId: string,
    roleId: string,
    reason: string
  ): Promise<void> {
    await this.discord.addRoleToMember(guildId, targetUserId, roleId, reason);
  }

  public async removeRole(
    guildId: string,
    targetUserId: string,
    roleId: string,
    reason: string
  ): Promise<void> {
    await this.discord.removeRoleFromMember(guildId, targetUserId, roleId, reason);
  }

  public async listRoles(guildId: string): Promise<RoleListItem[]> {
    return this.discord.listRoles(guildId);
  }
}

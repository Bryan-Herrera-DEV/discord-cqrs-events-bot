import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember,
  type PermissionsString
} from "discord.js";

import { AuthorizationError } from "@shared/application/errors";

export class DiscordPermissionService {
  public static assertPermission(
    interaction: ChatInputCommandInteraction,
    permission: bigint,
    message: string
  ): void {
    if (!interaction.inGuild()) {
      throw new AuthorizationError("Este comando solo puede ejecutarse dentro de un servidor");
    }
    if (!interaction.memberPermissions?.has(permission)) {
      throw new AuthorizationError(message);
    }
  }

  public static assertAnyRole(member: GuildMember, allowedRoleIds: string[], message: string): void {
    if (allowedRoleIds.length === 0) {
      return;
    }
    const hasRole = member.roles.cache.some((role) => allowedRoleIds.includes(role.id));
    if (!hasRole) {
      throw new AuthorizationError(message);
    }
  }

  public static assertCanManageRole(
    actor: GuildMember,
    target: GuildMember,
    rolePosition: number
  ): void {
    if (!actor.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new AuthorizationError("No tienes permiso para gestionar roles");
    }

    if (actor.roles.highest.position <= rolePosition) {
      throw new AuthorizationError(
        "No puedes gestionar un rol igual o superior al rol más alto que tienes"
      );
    }

    if (actor.roles.highest.position <= target.roles.highest.position) {
      throw new AuthorizationError(
        "No puedes modificar roles de un miembro con igual o mayor jerarquía"
      );
    }
  }

  public static assertGuildPermission(
    member: GuildMember,
    permission: PermissionsString,
    message: string
  ): void {
    if (!member.permissions.has(permission)) {
      throw new AuthorizationError(message);
    }
  }
}

import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

import { AuthorizationError } from "@shared/application/errors";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";
import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

const hasAnyRole = (memberRoleIds: string[], allowedRoleIds: string[]): boolean =>
  allowedRoleIds.some((roleId) => memberRoleIds.includes(roleId));

export class CommandAuthorizationService {
  public constructor(
    private readonly queryBus: InMemoryQueryBus,
    private readonly discord: DiscordGateway
  ) {}

  public async getGuildSettings(interaction: ChatInputCommandInteraction): Promise<GuildSettings> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new AuthorizationError("Este comando solo puede ejecutarse en un servidor");
    }
    return this.queryBus.execute<GuildSettings>(new GetGuildSettingsQuery({ guildId }));
  }

  public async assertAdmin(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new AuthorizationError("Este comando solo puede ejecutarse en un servidor");
    }
    const settings = await this.getGuildSettings(interaction);
    const nativeAllowed =
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (nativeAllowed) {
      return;
    }

    const memberRoleIds = await this.discord.getMemberRoleIds(guildId, interaction.user.id);
    if (hasAnyRole(memberRoleIds, settings.permissionPolicies.adminRoleIds)) {
      return;
    }

    throw new AuthorizationError(
      "Necesitas Administrator/ManageGuild o un rol administrativo configurado"
    );
  }

  public async assertRoleManager(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new AuthorizationError("Este comando solo puede ejecutarse en un servidor");
    }

    const settings = await this.getGuildSettings(interaction);
    const nativeAllowed = interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles);
    if (nativeAllowed) {
      return;
    }

    const memberRoleIds = await this.discord.getMemberRoleIds(guildId, interaction.user.id);
    if (hasAnyRole(memberRoleIds, settings.permissionPolicies.roleManagerRoleIds)) {
      return;
    }

    throw new AuthorizationError(
      "Necesitas ManageRoles o un rol gestor de roles configurado"
    );
  }

  public async assertModerator(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new AuthorizationError("Este comando solo puede ejecutarse en un servidor");
    }

    const settings = await this.getGuildSettings(interaction);
    const nativeAllowed =
      interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
    if (nativeAllowed) {
      return;
    }

    const memberRoleIds = await this.discord.getMemberRoleIds(guildId, interaction.user.id);
    if (hasAnyRole(memberRoleIds, settings.permissionPolicies.moderatorRoleIds)) {
      return;
    }

    throw new AuthorizationError(
      "Necesitas permisos de moderación o un rol moderador configurado"
    );
  }
}

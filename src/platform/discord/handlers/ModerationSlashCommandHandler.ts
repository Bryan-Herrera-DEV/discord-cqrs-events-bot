import { EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";
import { AuthorizationError } from "@shared/application/errors";

import { WarnMemberCommand } from "@contexts/moderation/application/commands/WarnMemberCommand";
import { KickMemberCommand } from "@contexts/moderation/application/commands/KickMemberCommand";
import { BanMemberCommand } from "@contexts/moderation/application/commands/BanMemberCommand";
import { UnbanMemberCommand } from "@contexts/moderation/application/commands/UnbanMemberCommand";
import { TimeoutMemberCommand } from "@contexts/moderation/application/commands/TimeoutMemberCommand";
import { PurgeMessagesCommand } from "@contexts/moderation/application/commands/PurgeMessagesCommand";
import { ViewModerationCaseQuery } from "@contexts/moderation/application/queries/ViewModerationCaseQuery";
import type { WarnMemberResult } from "@contexts/moderation/application/commands/WarnMemberCommand";
import type { KickMemberResult } from "@contexts/moderation/application/commands/KickMemberCommand";
import type { BanMemberResult } from "@contexts/moderation/application/commands/BanMemberCommand";
import type { UnbanMemberResult } from "@contexts/moderation/application/commands/UnbanMemberCommand";
import type { TimeoutMemberResult } from "@contexts/moderation/application/commands/TimeoutMemberCommand";
import type { PurgeMessagesResult } from "@contexts/moderation/application/commands/PurgeMessagesCommand";
import type { ModerationCaseView } from "@contexts/moderation/application/queries/ViewModerationCaseQuery";

const assertNativePermission = (
  interaction: ChatInputCommandInteraction,
  permission: bigint,
  message: string
): void => {
  if (!interaction.memberPermissions?.has(permission)) {
    throw new AuthorizationError(message);
  }
};

export class ModerationSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "mod";
  private readonly authorizationService: CommandAuthorizationService;

  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus,
    discordGateway: import("@platform/discord/DiscordGateway").DiscordGateway
  ) {
    this.authorizationService = new CommandAuthorizationService(this.queryBus, discordGateway);
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await this.authorizationService.assertModerator(interaction);
    const guildId = interaction.guildId as string;
    const subcommand = interaction.options.getSubcommand(true);
    const subcommandGroup = interaction.options.getSubcommandGroup(false);

    if (subcommandGroup === "case" && subcommand === "view") {
      const number = interaction.options.getInteger("number", true);
      const result = await this.queryBus.execute<ModerationCaseView | null>(
        new ViewModerationCaseQuery({
          guildId,
          caseNumber: number
        })
      );

      if (!result) {
        await interaction.reply({
          ephemeral: true,
          content: `No se encontró el caso #${number}`
        });
        return;
      }

      const actions = result.actions
        .map((action) => `${action.createdAt.toISOString()} - ${action.actionType} por <@${action.actorUserId}>`)
        .join("\n");

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x1f4d78)
            .setTitle(`Caso #${result.case.caseNumber}`)
            .setDescription(
              [
                `Acción: ${result.case.actionType}`,
                `Objetivo: ${result.case.targetUserId ? `<@${result.case.targetUserId}>` : "N/A"}`,
                `Moderador: <@${result.case.moderatorUserId}>`,
                `Razón: ${result.case.reason}`,
                `Estado: ${result.case.status}`,
                actions ? `Historial:\n${actions}` : "Sin historial"
              ].join("\n")
            )
        ]
      });
      return;
    }

    if (subcommand === "warn") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const result = await this.commandBus.execute<WarnMemberResult>(
        new WarnMemberCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          targetUserId: user.id,
          reason
        })
      );
      await this.replyCase(interaction, "Warn aplicado", result.caseNumber, user.id);
      return;
    }

    if (subcommand === "kick") {
      assertNativePermission(interaction, PermissionFlagsBits.KickMembers, "Necesitas Kick Members");
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const result = await this.commandBus.execute<KickMemberResult>(
        new KickMemberCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          targetUserId: user.id,
          reason
        })
      );
      await this.replyCase(interaction, "Kick ejecutado", result.caseNumber, user.id);
      return;
    }

    if (subcommand === "ban") {
      assertNativePermission(interaction, PermissionFlagsBits.BanMembers, "Necesitas Ban Members");
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      const softBan = interaction.options.getBoolean("softban") ?? false;
      const result = await this.commandBus.execute<BanMemberResult>(
        new BanMemberCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          targetUserId: user.id,
          reason,
          softBan
        })
      );
      await this.replyCase(
        interaction,
        softBan ? "Softban ejecutado" : "Ban ejecutado",
        result.caseNumber,
        user.id
      );
      return;
    }

    if (subcommand === "unban") {
      assertNativePermission(interaction, PermissionFlagsBits.BanMembers, "Necesitas Ban Members");
      const userId = interaction.options.getString("user_id", true);
      const reason = interaction.options.getString("reason", true);
      const result = await this.commandBus.execute<UnbanMemberResult>(
        new UnbanMemberCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          targetUserId: userId,
          reason
        })
      );
      await this.replyCase(interaction, "Unban ejecutado", result.caseNumber, userId);
      return;
    }

    if (subcommand === "timeout") {
      assertNativePermission(
        interaction,
        PermissionFlagsBits.ModerateMembers,
        "Necesitas Moderate Members"
      );
      const user = interaction.options.getUser("user", true);
      const minutes = interaction.options.getInteger("minutes", true);
      const reason = interaction.options.getString("reason", true);
      const durationMs = minutes * 60_000;
      const result = await this.commandBus.execute<TimeoutMemberResult>(
        new TimeoutMemberCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          targetUserId: user.id,
          durationMs,
          reason
        })
      );
      await this.replyCase(interaction, "Timeout aplicado", result.caseNumber, user.id);
      return;
    }

    if (subcommand === "purge") {
      assertNativePermission(
        interaction,
        PermissionFlagsBits.ManageMessages,
        "Necesitas Manage Messages"
      );
      const amount = interaction.options.getInteger("amount", true);
      const reason = interaction.options.getString("reason", true);
      const channelId = interaction.channelId;
      const result = await this.commandBus.execute<PurgeMessagesResult>(
        new PurgeMessagesCommand({
          guildId,
          moderatorUserId: interaction.user.id,
          channelId,
          amount,
          reason
        })
      );
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xb33939)
            .setTitle("Purge ejecutado")
            .setDescription(
              `Mensajes eliminados: ${result.deleted}\nCaso: #${result.caseNumber}\nCanal: <#${channelId}>`
            )
        ]
      });
    }
  }

  private async replyCase(
    interaction: ChatInputCommandInteraction,
    title: string,
    caseNumber: number,
    targetUserId: string
  ): Promise<void> {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xb33939)
          .setTitle(title)
          .setDescription(`Objetivo: <@${targetUserId}>\nCaso: #${caseNumber}`)
      ]
    });
  }
}

import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";
import { AuthorizationError } from "@shared/application/errors";

import { AdminPingQuery } from "@contexts/administration/application/queries/AdminPingQuery";
import { UpsertGuildSettingsCommand } from "@contexts/guild-settings/application/commands/UpsertGuildSettingsCommand";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { AdminPingView } from "@contexts/administration/application/queries/AdminPingQuery";
import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export class AdminSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "admin";

  private readonly authorizationService: CommandAuthorizationService;

  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus,
    discordGateway: import("@platform/discord/DiscordGateway").DiscordGateway
  ) {
    this.authorizationService = new CommandAuthorizationService(this.queryBus, discordGateway);
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "ping") {
      await this.authorizationService.assertAdmin(interaction);
      await this.loadSettingsAndAssertAdminChannel(interaction);
      const status = await this.queryBus.execute<AdminPingView>(new AdminPingQuery());
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Admin Pong")
            .setDescription(
              `Uptime: ${status.uptimeSeconds}s\nAPI latency: ${Math.round(interaction.client.ws.ping)}ms`
            )
            .setTimestamp(new Date(status.now))
        ]
      });
      return;
    }

    await this.authorizationService.assertAdmin(interaction);
    const guildSettings = await this.loadSettingsAndAssertAdminChannel(interaction);
    const guildId = interaction.guildId as string;

    if (subcommand === "config") {
      const logsChannel = interaction.options.getChannel("logs_channel");
      const levelingEnabled = interaction.options.getBoolean("leveling_enabled");
      const moderationEnabled = interaction.options.getBoolean("moderation_enabled");
      const language = interaction.options.getString("language");

      const noPatchInput =
        !logsChannel &&
        typeof levelingEnabled !== "boolean" &&
        typeof moderationEnabled !== "boolean" &&
        !language;

      if (noPatchInput) {
        const settings = guildSettings;
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setTitle("Configuración actual")
              .setColor(0x1f4d78)
              .setDescription(
                [
                  `Idioma: ${settings.language}`,
                  `Canal logs: ${settings.channels.logsChannelId ? `<#${settings.channels.logsChannelId}>` : "No configurado"}`,
                  `Moderación: ${settings.featureFlags.moderationEnabled ? "Activa" : "Inactiva"}`,
                  `Niveles: ${settings.featureFlags.levelingEnabled ? "Activo" : "Inactivo"}`,
                  `Alertas de nivel: ${settings.featureFlags.levelUpAlertsEnabled ? "Activas" : "Inactivas"}`,
                  `Canal de alertas: ${settings.channels.alertChannelId ? `<#${settings.channels.alertChannelId}>` : "No configurado"}`
                ].join("\n")
              )
          ]
        });
        return;
      }

      await this.commandBus.execute(
        new UpsertGuildSettingsCommand({
          guildId,
          changedBy: interaction.user.id,
          language: language ?? undefined,
          channels: {
            logsChannelId: logsChannel?.id
          },
          featureFlags: {
            levelingEnabled: levelingEnabled ?? undefined,
            moderationEnabled: moderationEnabled ?? undefined
          }
        })
      );

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setTitle("Configuración actualizada")
            .setColor(0x2d7a46)
            .setDescription("Los cambios de configuración se guardaron correctamente.")
        ]
      });
      return;
    }

    if (subcommand === "levels") {
      const alertsEnabled = interaction.options.getBoolean("alerts_enabled");
      const alertsChannel = interaction.options.getChannel("alerts_channel");

      const noPatchInput = typeof alertsEnabled !== "boolean" && !alertsChannel;

      if (noPatchInput) {
        const settings = guildSettings;
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setTitle("Configuración de niveles")
              .setColor(0x1f4d78)
              .setDescription(
                [
                  `Niveles: ${settings.featureFlags.levelingEnabled ? "Activo" : "Inactivo"}`,
                  `Alertas de subida: ${settings.featureFlags.levelUpAlertsEnabled ? "Activas" : "Inactivas"}`,
                  `Canal alertas: ${settings.channels.alertChannelId ? `<#${settings.channels.alertChannelId}>` : "No configurado"}`
                ].join("\n")
              )
          ]
        });
        return;
      }

      await this.commandBus.execute(
        new UpsertGuildSettingsCommand({
          guildId,
          changedBy: interaction.user.id,
          channels: {
            alertChannelId: alertsChannel?.id
          },
          featureFlags: {
            levelUpAlertsEnabled: alertsEnabled ?? undefined
          }
        })
      );

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setTitle("Niveles actualizados")
            .setColor(0x2d7a46)
            .setDescription("La configuración de alertas de nivel fue guardada correctamente.")
        ]
      });
    }
  }

  private async loadSettingsAndAssertAdminChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<GuildSettings> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new AuthorizationError("Este comando solo puede ejecutarse en un servidor");
    }

    const guildSettings = await this.queryBus.execute<GuildSettings>(
      new GetGuildSettingsQuery({ guildId })
    );
    const adminChannelIds = guildSettings.channels.administrationChannelIds ?? [];
    if (adminChannelIds.length > 0 && !adminChannelIds.includes(interaction.channelId)) {
      throw new AuthorizationError(
        "Este comando admin solo puede ejecutarse en los canales de administracion configurados"
      );
    }

    return guildSettings;
  }
}

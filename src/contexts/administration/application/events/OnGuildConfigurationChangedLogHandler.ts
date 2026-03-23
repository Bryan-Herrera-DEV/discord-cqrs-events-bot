import { EmbedBuilder } from "discord.js";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import type { DomainEventHandler } from "@shared/application/EventBus";
import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { GuildConfigurationChangedPayload } from "@shared/domain/events/BotEvents";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

export class OnGuildConfigurationChangedLogHandler {
  public constructor(
    private readonly guildSettingsRepository: GuildSettingsRepository,
    private readonly discord: DiscordGateway,
    private readonly logger: Logger
  ) {}

  public build(): DomainEventHandler<DomainEvent<GuildConfigurationChangedPayload>> {
    return async (event) => {
      const settings = await this.guildSettingsRepository.findByGuildId(event.payload.guildId);
      const channelId = settings?.channels.logsChannelId;
      if (!channelId) {
        return;
      }

      const changedFields =
        event.payload.changedFields.length > 0
          ? event.payload.changedFields.join(", ")
          : "sin detalle";
      const changedBy = /^\d+$/u.test(event.payload.changedBy)
        ? `<@${event.payload.changedBy}>`
        : event.payload.changedBy;

      try {
        await this.discord.sendMessage(channelId, {
          embeds: [
            new EmbedBuilder()
              .setTitle("Reporte de administracion")
              .setColor(0x1f4d78)
              .setDescription(
                [
                  "Se actualizo la configuracion del servidor.",
                  `Ejecutado por: ${changedBy}`,
                  `Campos modificados: ${changedFields}`
                ].join("\n")
              )
              .setTimestamp(event.occurredAt)
          ]
        });
      } catch (error) {
        this.logger.warn("admin.log.send-failed", {
          guildId: event.payload.guildId,
          channelId,
          error
        });
      }
    };
  }
}

import {
  type CacheType,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions
} from "discord.js";

import { ApplicationError } from "@shared/application/errors";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import type { MetricsRegistry } from "@shared/infrastructure/observability/metrics";
import type { CommandIdempotencyStore } from "@shared/infrastructure/idempotency/CommandIdempotencyStore";
import type { RateLimiter } from "@shared/infrastructure/rate-limit/RateLimiter";
import { dangerEmbed, infoEmbed, warningEmbed } from "@platform/discord/MessageEmbeds";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export interface SlashCommandHandler {
  readonly commandName: string;
  handle(interaction: ChatInputCommandInteraction<CacheType>): Promise<void>;
}

const isUnknownInteractionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: number | string;
    rawError?: { code?: number | string };
  };

  return maybeError.code === 10062 || maybeError.rawError?.code === 10062;
};

export class InteractionRouter {
  private readonly handlers: Map<string, SlashCommandHandler>;

  public constructor(
    handlers: SlashCommandHandler[],
    private readonly logger: Logger,
    private readonly metrics: MetricsRegistry,
    private readonly idempotencyStore: CommandIdempotencyStore,
    private readonly rateLimiter: RateLimiter,
    private readonly idempotencyTtlSeconds: number,
    private readonly queryBus: InMemoryQueryBus
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.commandName, handler]));
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const handler = this.handlers.get(interaction.commandName);
    if (!handler) {
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [infoEmbed("Comando no disponible", "Este comando todavía no está implementado.")]
      });
      return;
    }

    if (!(await this.isAllowedCommandChannel(interaction))) {
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [
          warningEmbed(
            "Canal no permitido",
            "Este comando solo puede ejecutarse en los canales autorizados por la administracion."
          )
        ]
      });
      return;
    }

    const rateLimitResult = await this.rateLimiter.consume(
      `${interaction.guildId ?? "dm"}:${interaction.user.id}:${interaction.commandName}`
    );
    if (!rateLimitResult.allowed) {
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [
          warningEmbed(
            "Demasiadas solicitudes",
            `Estás enviando comandos demasiado rápido. Intenta nuevamente en ${Math.ceil(
              rateLimitResult.retryAfterMs / 1000
            )}s.`
          )
        ]
      });
      return;
    }

    const idempotencyKey = interaction.id;
    const beginResult = await this.idempotencyStore.begin(
      idempotencyKey,
      this.idempotencyTtlSeconds,
      interaction.commandName
    );
    if (beginResult === "already_processed") {
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [
          infoEmbed("Comando ya procesado", "Esta interacción ya fue procesada anteriormente.")
        ]
      });
      return;
    }
    if (beginResult === "in_progress") {
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [infoEmbed("Comando en proceso", "Esta interacción todavía está en ejecución.")]
      });
      return;
    }

    try {
      this.metrics.commandCounter.inc({ command: interaction.commandName });
      await handler.handle(interaction);
      await this.idempotencyStore.complete(idempotencyKey);
    } catch (error) {
      await this.idempotencyStore.fail(
        idempotencyKey,
        error instanceof Error ? error.message : "error desconocido"
      );
      await this.handleError(interaction, error, interaction.commandName);
    }
  }

  private async isAllowedCommandChannel(
    interaction: ChatInputCommandInteraction
  ): Promise<boolean> {
    if (!interaction.guildId) {
      return true;
    }

    let settings: GuildSettings;
    try {
      settings = await this.queryBus.execute<GuildSettings>(
        new GetGuildSettingsQuery({ guildId: interaction.guildId })
      );
    } catch (error) {
      this.logger.warn("interaction.channel-policy.lookup-failed", {
        guildId: interaction.guildId,
        commandName: interaction.commandName,
        error
      });
      return true;
    }

    const allowedChannelIds = settings.channels.botCommandChannelIds ?? [];
    const adminChannelIds = settings.channels.administrationChannelIds ?? [];

    if (interaction.commandName === "admin" && adminChannelIds.length > 0) {
      if (!interaction.channelId) {
        return false;
      }

      return adminChannelIds.includes(interaction.channelId);
    }

    if (interaction.commandName === "music" && settings.channels.musicCommandChannelId) {
      if (!interaction.channelId) {
        return false;
      }

      return interaction.channelId === settings.channels.musicCommandChannelId;
    }

    if (allowedChannelIds.length === 0) {
      return true;
    }

    if (!interaction.channelId) {
      return false;
    }

    return allowedChannelIds.includes(interaction.channelId);
  }

  private async handleError(
    interaction: ChatInputCommandInteraction,
    error: unknown,
    commandName: string
  ): Promise<void> {
    if (error instanceof ApplicationError) {
      this.metrics.commandFailureCounter.inc({ command: commandName, code: error.code });
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [warningEmbed("No se pudo ejecutar el comando", error.message)]
      });
      return;
    }

    this.metrics.commandFailureCounter.inc({ command: commandName, code: "INTERNAL_ERROR" });
    this.logger.error("interaction.failed", {
      commandName,
      interactionId: interaction.id,
      error
    });

    await this.replySafe(interaction, {
      ephemeral: true,
      embeds: [
        dangerEmbed(
          "Error interno",
          "Ocurrió un error inesperado. El incidente fue registrado para revisión interna."
        )
      ]
    });
  }

  private async replySafe(
    interaction: ChatInputCommandInteraction,
    payload: InteractionReplyOptions
  ): Promise<void> {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
        return;
      }
      await interaction.reply(payload);
    } catch (error) {
      if (isUnknownInteractionError(error)) {
        this.logger.warn("interaction.reply.unknown", {
          interactionId: interaction.id,
          commandName: interaction.commandName,
          error
        });
        return;
      }

      throw error;
    }
  }
}

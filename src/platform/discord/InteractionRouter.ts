import {
  EmbedBuilder,
  type CacheType,
  type ChatInputCommandInteraction,
  type InteractionReplyOptions
} from "discord.js";

import { ApplicationError } from "@shared/application/errors";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import type { MetricsRegistry } from "@shared/infrastructure/observability/metrics";
import type { CommandIdempotencyStore } from "@shared/infrastructure/idempotency/CommandIdempotencyStore";
import type { RateLimiter } from "@shared/infrastructure/rate-limit/RateLimiter";

export interface SlashCommandHandler {
  readonly commandName: string;
  handle(interaction: ChatInputCommandInteraction<CacheType>): Promise<void>;
}

export class InteractionRouter {
  private readonly handlers: Map<string, SlashCommandHandler>;

  public constructor(
    handlers: SlashCommandHandler[],
    private readonly logger: Logger,
    private readonly metrics: MetricsRegistry,
    private readonly idempotencyStore: CommandIdempotencyStore,
    private readonly rateLimiter: RateLimiter,
    private readonly idempotencyTtlSeconds: number
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.commandName, handler]));
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const handler = this.handlers.get(interaction.commandName);
    if (!handler) {
      await this.replySafe(interaction, {
        ephemeral: true,
        content: "Comando no implementado"
      });
      return;
    }

    const rateLimitResult = await this.rateLimiter.consume(
      `${interaction.guildId ?? "dm"}:${interaction.user.id}:${interaction.commandName}`
    );
    if (!rateLimitResult.allowed) {
      await this.replySafe(interaction, {
        ephemeral: true,
        content: `Estás enviando comandos demasiado rápido. Intenta nuevamente en ${Math.ceil(
          rateLimitResult.retryAfterMs / 1000
        )}s.`
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
        content: "Este comando ya fue procesado anteriormente."
      });
      return;
    }
    if (beginResult === "in_progress") {
      await this.replySafe(interaction, {
        ephemeral: true,
        content: "Este comando aún está en proceso."
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

  private async handleError(
    interaction: ChatInputCommandInteraction,
    error: unknown,
    commandName: string
  ): Promise<void> {
    if (error instanceof ApplicationError) {
      this.metrics.commandFailureCounter.inc({ command: commandName, code: error.code });
      await this.replySafe(interaction, {
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setTitle("No se pudo ejecutar el comando")
            .setDescription(error.message)
            .setColor(0xe67e22)
        ]
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
        new EmbedBuilder()
          .setTitle("Error interno")
          .setDescription(
            "Ocurrió un error inesperado. El incidente fue registrado para revisión interna."
          )
          .setColor(0xc0392b)
      ]
    });
  }

  private async replySafe(
    interaction: ChatInputCommandInteraction,
    payload: InteractionReplyOptions
  ): Promise<void> {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
      return;
    }
    await interaction.reply(payload);
  }
}

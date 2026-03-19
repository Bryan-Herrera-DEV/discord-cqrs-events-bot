import { AttachmentBuilder, EmbedBuilder } from "discord.js";

import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { GoodbyeMessageRequestedPayload } from "@shared/domain/events/BotEvents";
import type { DomainEventHandler } from "@shared/application/EventBus";
import type { Logger } from "@shared/infrastructure/logger/Logger";

import type { WelcomeImageGeneratorPort } from "@contexts/welcome/application/ports/WelcomeImageGeneratorPort";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

const renderGoodbyeMessage = (payload: GoodbyeMessageRequestedPayload): string =>
  `Hasta luego <@${payload.userId}>. Gracias por compartir con nosotros, ${payload.displayName}.`;

export class OnGoodbyeMessageRequestedHandler {
  public constructor(
    private readonly imageGenerator: WelcomeImageGeneratorPort,
    private readonly guildSettingsRepository: GuildSettingsRepository,
    private readonly discord: DiscordGateway,
    private readonly logger: Logger
  ) {}

  public build(): DomainEventHandler<DomainEvent<GoodbyeMessageRequestedPayload>> {
    return async (event) => {
      const settings = await this.guildSettingsRepository.findByGuildId(event.payload.guildId);
      if (settings && !settings.featureFlags.goodbyeEnabled) {
        return;
      }

      const channelId = settings?.channels.goodbyeChannelId;
      if (!channelId) {
        this.logger.warn("goodbye.channel.not-configured", { guildId: event.payload.guildId });
        return;
      }

      const message = renderGoodbyeMessage(event.payload);
      await this.dispatchMessage(channelId, event.payload, message);
    };
  }

  private async dispatchMessage(
    channelId: string,
    payload: GoodbyeMessageRequestedPayload,
    message: string
  ): Promise<void> {
    let imageAttachment: AttachmentBuilder | null = null;
    let imageAvailable = false;
    const accentColor = 0x8f3a2f;
    const username = payload.username ?? payload.displayName;

    try {
      const image = await this.imageGenerator.generate({
        displayName: payload.displayName,
        username,
        avatarUrl: payload.avatarUrl,
        title: "Adiós, ctmr",
        subtitle: `@${username}`,
        accentColor,
        variant: "goodbye"
      });
      imageAttachment = new AttachmentBuilder(image, { name: "goodbye.png" });
      imageAvailable = true;
    } catch (error) {
      this.logger.warn("goodbye.image.failed", {
        guildId: payload.guildId,
        error
      });
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(accentColor)
        .setTitle("Hasta pronto")
        .setDescription(message)
        .setAuthor({
          name: payload.displayName,
          iconURL: payload.avatarUrl
        })
        .setFooter({ text: "Sistema de despedidas" })
        .setTimestamp();

      if (imageAvailable) {
        embed.setImage("attachment://goodbye.png");
      } else {
        embed.setThumbnail(payload.avatarUrl ?? null);
      }

      await this.discord.sendMessage(channelId, {
        content: `<@${payload.userId}>`,
        files: imageAttachment ? [imageAttachment] : [],
        embeds: [embed]
      });
      return;
    } catch (error) {
      this.logger.warn("goodbye.send.failed", {
        guildId: payload.guildId,
        channelId,
        error
      });
    }
  }
}

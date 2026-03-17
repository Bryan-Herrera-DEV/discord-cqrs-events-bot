import { AttachmentBuilder, EmbedBuilder } from "discord.js";

import type { DomainEventHandler } from "@shared/application/EventBus";
import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { WelcomeMessageRequestedPayload } from "@shared/domain/events/BotEvents";
import type { Logger } from "@shared/infrastructure/logger/Logger";

import type { WelcomeImageGeneratorPort } from "@contexts/welcome/application/ports/WelcomeImageGeneratorPort";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

const renderWelcomeMessage = (payload: WelcomeMessageRequestedPayload): string =>
  `Bienvenido/a <@${payload.userId}>! Nos alegra tenerte aqui, ${payload.displayName}.`;

export class OnWelcomeMessageRequestedHandler {
  public constructor(
    private readonly imageGenerator: WelcomeImageGeneratorPort,
    private readonly discord: DiscordGateway,
    private readonly logger: Logger
  ) {}

  public build(): DomainEventHandler<DomainEvent<WelcomeMessageRequestedPayload>> {
    return async (event) => {
      const channelId = await this.discord.getDefaultAnnouncementChannelId(event.payload.guildId);
      if (!channelId) {
        this.logger.warn("welcome.channel.not-found", { guildId: event.payload.guildId });
        return;
      }

      const message = renderWelcomeMessage(event.payload);
      await this.dispatchMessage(channelId, event.payload, message);
    };
  }

  private async dispatchMessage(
    channelId: string,
    payload: WelcomeMessageRequestedPayload,
    message: string
  ): Promise<void> {
    let imageAttachment: AttachmentBuilder | null = null;
    let imageAvailable = false;

    try {
      const image = await this.imageGenerator.generate({
        displayName: payload.displayName,
        username: payload.displayName,
        avatarUrl: payload.avatarUrl,
        title: "Bienvenido/a"
      });
      imageAttachment = new AttachmentBuilder(image, { name: "welcome.png" });
      imageAvailable = true;
    } catch (error) {
      this.logger.warn("welcome.image.failed", {
        guildId: payload.guildId,
        error
      });
    }

    try {
      const embed = new EmbedBuilder().setColor(0x2d7a46).setTitle("Bienvenido/a");
      if (imageAvailable) {
        embed.setImage("attachment://welcome.png");
      } else {
        embed.setDescription(message);
      }

      await this.discord.sendMessage(channelId, {
        content: message,
        files: imageAttachment ? [imageAttachment] : [],
        embeds: [embed]
      });
      return;
    } catch (error) {
      this.logger.warn("welcome.send.failed", {
        guildId: payload.guildId,
        channelId,
        error
      });
    }
  }
}

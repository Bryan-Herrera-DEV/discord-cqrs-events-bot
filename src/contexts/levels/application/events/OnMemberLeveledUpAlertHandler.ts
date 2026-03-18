import { AttachmentBuilder, EmbedBuilder } from "discord.js";

import type { DomainEventHandler } from "@shared/application/EventBus";
import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { MemberLeveledUpPayload } from "@shared/domain/events/BotEvents";
import type { Logger } from "@shared/infrastructure/logger/Logger";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { LevelUpAlertGeneratorPort } from "@contexts/levels/application/ports/LevelUpAlertGeneratorPort";
import { buildLevelTierLabel, resolveLevelTier } from "@contexts/levels/domain/LevelTier";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

interface MemberAlertProfile {
  displayName: string;
  avatarUrl?: string;
}

const fallbackDisplayName = (userId: string): string => `Usuario ${userId.slice(0, 6)}`;

export class OnMemberLeveledUpAlertHandler {
  public constructor(
    private readonly guildSettingsRepository: GuildSettingsRepository,
    private readonly imageGenerator: LevelUpAlertGeneratorPort,
    private readonly discord: DiscordGateway,
    private readonly logger: Logger
  ) {}

  public build(): DomainEventHandler<DomainEvent<MemberLeveledUpPayload>> {
    return async (event) => {
      const settings =
        (await this.guildSettingsRepository.findByGuildId(event.payload.guildId)) ??
        defaultGuildSettings(event.payload.guildId);

      if (!settings.featureFlags.levelingEnabled || !settings.featureFlags.levelUpAlertsEnabled) {
        return;
      }

      const channelId =
        settings.channels.levelUpChannelId ??
        (await this.discord.getDefaultAnnouncementChannelId(event.payload.guildId));

      if (!channelId) {
        this.logger.warn("levels.alert.channel.not-found", {
          guildId: event.payload.guildId
        });
        return;
      }

      const memberProfile = await this.resolveMemberProfile(
        event.payload.guildId,
        event.payload.userId
      );
      await this.dispatchAlert(channelId, event.payload, memberProfile);
    };
  }

  private async resolveMemberProfile(guildId: string, userId: string): Promise<MemberAlertProfile> {
    try {
      const member = await this.discord.getMemberProfile(guildId, userId);
      return {
        displayName: member.displayName,
        avatarUrl: member.avatarUrl
      };
    } catch (error) {
      this.logger.warn("levels.alert.member.fetch-failed", {
        guildId,
        userId,
        error
      });
      return {
        displayName: fallbackDisplayName(userId)
      };
    }
  }

  private async dispatchAlert(
    channelId: string,
    payload: MemberLeveledUpPayload,
    memberProfile: MemberAlertProfile
  ): Promise<void> {
    let imageAttachment: AttachmentBuilder | null = null;
    let imageAvailable = false;

    try {
      const image = await this.imageGenerator.generate({
        displayName: memberProfile.displayName,
        avatarUrl: memberProfile.avatarUrl,
        previousLevel: payload.previousLevel,
        newLevel: payload.newLevel,
        totalXp: payload.xp
      });
      imageAttachment = new AttachmentBuilder(image, { name: "level-up.png" });
      imageAvailable = true;
    } catch (error) {
      this.logger.warn("levels.alert.image.failed", {
        guildId: payload.guildId,
        userId: payload.userId,
        error
      });
    }

    const currentTier = resolveLevelTier(payload.newLevel);
    const previousTier = resolveLevelTier(payload.previousLevel);
    const tierLabel = buildLevelTierLabel(payload.newLevel);
    const unlockedTier = currentTier.id !== previousTier.id;

    const lines = [
      `<@${payload.userId}> subio al nivel **${payload.newLevel}**.`,
      `Tier actual: **${tierLabel}**`,
      `XP total: **${payload.xp}**`
    ];

    if (unlockedTier) {
      lines.splice(1, 0, `Nuevo tier desbloqueado: **${currentTier.label}**`);
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(currentTier.accentColor)
        .setTitle("Subida de nivel")
        .setDescription(lines.join("\n"))
        .setAuthor({
          name: memberProfile.displayName,
          iconURL: memberProfile.avatarUrl
        })
        .setFooter({ text: "Sistema de niveles" })
        .setTimestamp();

      if (imageAvailable) {
        embed.setImage("attachment://level-up.png");
      } else {
        embed.setThumbnail(memberProfile.avatarUrl ?? null);
      }

      await this.discord.sendMessage(channelId, {
        content: `<@${payload.userId}>`,
        files: imageAttachment ? [imageAttachment] : [],
        embeds: [embed]
      });
      return;
    } catch (error) {
      this.logger.warn("levels.alert.send.failed", {
        guildId: payload.guildId,
        channelId,
        userId: payload.userId,
        error
      });
    }
  }
}

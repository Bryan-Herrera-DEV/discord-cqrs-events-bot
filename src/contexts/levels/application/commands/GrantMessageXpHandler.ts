import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { LevelProfileRepository } from "@contexts/levels/application/ports/LevelProfileRepository";
import type { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { GrantMessageXpCommand } from "@contexts/levels/application/commands/GrantMessageXpCommand";

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export class GrantMessageXpHandler implements CommandHandler<GrantMessageXpCommand, void> {
  public constructor(
    private readonly repository: LevelProfileRepository,
    private readonly levelPolicy: LevelPolicy,
    private readonly eventBus: InMemoryEventBus,
    private readonly guildSettingsRepository: GuildSettingsRepository
  ) {}

  public async handle(command: GrantMessageXpCommand): Promise<void> {
    const settings =
      (await this.guildSettingsRepository.findByGuildId(command.payload.guildId)) ??
      defaultGuildSettings(command.payload.guildId);

    if (!settings.featureFlags.levelingEnabled) {
      return;
    }

    const profile = await this.repository.findByGuildAndUser(
      command.payload.guildId,
      command.payload.userId
    );

    if (!profile) {
      await this.repository.createIfMissing(command.payload.guildId, command.payload.userId);
      return;
    }

    const now = new Date();
    const cooldownMs = command.payload.cooldownSeconds * 1000;
    if (profile.lastXpAt && now.getTime() - profile.lastXpAt.getTime() < cooldownMs) {
      return;
    }

    const gainedXp = randomBetween(command.payload.minXpGain, command.payload.maxXpGain);
    const previousLevel = profile.level;
    const updatedXp = profile.xp + gainedXp;
    const newLevel = this.levelPolicy.levelFromXp(updatedXp);

    await this.repository.save({
      ...profile,
      xp: updatedXp,
      level: newLevel,
      totalMessages: profile.totalMessages + 1,
      lastXpAt: now,
      updatedAt: now
    });

    if (newLevel > previousLevel) {
      await this.eventBus.publish(
        BotEvents.memberLeveledUp({
          guildId: command.payload.guildId,
          userId: command.payload.userId,
          previousLevel,
          newLevel,
          xp: updatedXp
        })
      );
    }
  }
}

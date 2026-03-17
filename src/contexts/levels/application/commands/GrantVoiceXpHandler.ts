import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { LevelProfileRepository } from "@contexts/levels/application/ports/LevelProfileRepository";
import type { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { GrantVoiceXpCommand } from "@contexts/levels/application/commands/GrantVoiceXpCommand";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export class GrantVoiceXpHandler implements CommandHandler<GrantVoiceXpCommand, void> {
  public constructor(
    private readonly repository: LevelProfileRepository,
    private readonly levelPolicy: LevelPolicy,
    private readonly eventBus: InMemoryEventBus,
    private readonly guildSettingsRepository: GuildSettingsRepository
  ) {}

  public async handle(command: GrantVoiceXpCommand): Promise<void> {
    const settings =
      (await this.guildSettingsRepository.findByGuildId(command.payload.guildId)) ??
      defaultGuildSettings(command.payload.guildId);

    if (!settings.featureFlags.levelingEnabled) {
      return;
    }

    const safeMinutes = clamp(
      Math.floor(command.payload.minutes),
      0,
      Math.max(0, command.payload.maxMinutesPerSession)
    );
    const gainedXp = safeMinutes * Math.max(0, command.payload.xpPerMinute);

    if (gainedXp <= 0) {
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

    const previousLevel = profile.level;
    const updatedXp = profile.xp + gainedXp;
    const newLevel = this.levelPolicy.levelFromXp(updatedXp);
    const now = new Date();

    await this.repository.save({
      ...profile,
      xp: updatedXp,
      level: newLevel,
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

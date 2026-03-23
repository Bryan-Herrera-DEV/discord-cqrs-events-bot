import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { LevelProfileRepository } from "@contexts/levels/application/ports/LevelProfileRepository";
import type { VoiceXpHistoryRepository } from "@contexts/levels/application/ports/VoiceXpHistoryRepository";
import type { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { GrantVoiceXpCommand } from "@contexts/levels/application/commands/GrantVoiceXpCommand";
import type { VoiceXpHistoryOutcome } from "@contexts/levels/domain/VoiceXpHistoryEntry";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export class GrantVoiceXpHandler implements CommandHandler<GrantVoiceXpCommand, void> {
  public constructor(
    private readonly repository: LevelProfileRepository,
    private readonly levelPolicy: LevelPolicy,
    private readonly eventBus: InMemoryEventBus,
    private readonly guildSettingsRepository: GuildSettingsRepository,
    private readonly voiceXpHistoryRepository: VoiceXpHistoryRepository
  ) {}

  public async handle(command: GrantVoiceXpCommand): Promise<void> {
    const safeParticipationMs = Math.max(0, Math.floor(command.payload.participationMs));
    const requestedMinutes = Math.floor(safeParticipationMs / 60_000);
    const settings =
      (await this.guildSettingsRepository.findByGuildId(command.payload.guildId)) ??
      defaultGuildSettings(command.payload.guildId);

    const safeMinutes = clamp(
      requestedMinutes,
      0,
      Math.max(0, command.payload.maxMinutesPerSession)
    );
    const safeXpPerMinute = Math.max(0, command.payload.xpPerMinute);
    const calculatedXp = safeMinutes * safeXpPerMinute;

    let profile = await this.repository.findByGuildAndUser(
      command.payload.guildId,
      command.payload.userId
    );
    let profileCreated = false;

    if (!profile) {
      await this.repository.createIfMissing(command.payload.guildId, command.payload.userId);
      profile = await this.repository.findByGuildAndUser(
        command.payload.guildId,
        command.payload.userId
      );
      profileCreated = true;
    }

    if (!profile) {
      return;
    }

    const previousLevel = profile.level;
    const previousXp = profile.xp;
    let newLevel = previousLevel;
    let newXp = previousXp;
    let grantedXp = 0;
    let outcome: VoiceXpHistoryOutcome;
    const now = new Date();

    if (!settings.featureFlags.levelingEnabled) {
      outcome = "skipped-leveling-disabled";
    } else if (calculatedXp <= 0) {
      outcome = "skipped-no-xp";
    } else {
      grantedXp = calculatedXp;
      newXp = previousXp + grantedXp;
      newLevel = this.levelPolicy.levelFromXp(newXp);

      await this.repository.save({
        ...profile,
        xp: newXp,
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
            xp: newXp
          })
        );
      }

      outcome = "granted";
    }

    await this.voiceXpHistoryRepository.append({
      guildId: command.payload.guildId,
      channelId: command.payload.channelId,
      userId: command.payload.userId,
      sessionStartedAt: command.payload.sessionStartedAt,
      sessionEndedAt: command.payload.sessionEndedAt,
      participationMs: safeParticipationMs,
      requestedMinutes,
      effectiveMinutes: safeMinutes,
      xpPerMinute: safeXpPerMinute,
      maxMinutesPerSession: Math.max(0, command.payload.maxMinutesPerSession),
      calculatedXp,
      grantedXp,
      profileCreated,
      previousXp,
      newXp,
      previousLevel,
      newLevel,
      outcome,
      createdAt: now
    });
  }
}

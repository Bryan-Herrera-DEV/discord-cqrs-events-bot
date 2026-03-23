import { describe, expect, it, vi } from "vitest";

import { GrantVoiceXpCommand } from "@contexts/levels/application/commands/GrantVoiceXpCommand";
import { GrantVoiceXpHandler } from "@contexts/levels/application/commands/GrantVoiceXpHandler";
import type {
  LeaderboardEntry,
  LevelProfileRepository
} from "@contexts/levels/application/ports/LevelProfileRepository";
import type { VoiceXpHistoryRepository } from "@contexts/levels/application/ports/VoiceXpHistoryRepository";
import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import type { LevelProfile } from "@contexts/levels/domain/LevelProfile";
import type { VoiceXpHistoryEntry } from "@contexts/levels/domain/VoiceXpHistoryEntry";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import {
  defaultGuildSettings,
  type GuildSettings
} from "@contexts/guild-settings/domain/GuildSettings";
import { InMemoryEventBus } from "@shared/application/EventBus";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";

class InMemoryLevelProfileRepository implements LevelProfileRepository {
  private readonly store = new Map<string, LevelProfile>();

  public async init(): Promise<void> {}

  public async createIfMissing(guildId: string, userId: string): Promise<void> {
    const key = `${guildId}:${userId}`;
    if (this.store.has(key)) {
      return;
    }

    const now = new Date();
    this.store.set(key, {
      guildId,
      userId,
      level: 1,
      xp: 0,
      totalMessages: 0,
      createdAt: now,
      updatedAt: now
    });
  }

  public async findByGuildAndUser(guildId: string, userId: string): Promise<LevelProfile | null> {
    return this.store.get(`${guildId}:${userId}`) ?? null;
  }

  public async save(profile: LevelProfile): Promise<void> {
    this.store.set(`${profile.guildId}:${profile.userId}`, profile);
  }

  public async topByGuild(_guildId: string, _limit: number): Promise<LeaderboardEntry[]> {
    return [];
  }

  public async rankByGuild(_guildId: string, _userId: string): Promise<number | null> {
    return null;
  }
}

class InMemoryVoiceXpHistoryRepository implements VoiceXpHistoryRepository {
  public readonly entries: VoiceXpHistoryEntry[] = [];

  public async init(): Promise<void> {}

  public async append(entry: VoiceXpHistoryEntry): Promise<void> {
    this.entries.push(entry);
  }
}

const buildGuildSettingsRepository = (levelingEnabled: boolean): GuildSettingsRepository => {
  const findByGuildId = vi.fn(async (guildId: string): Promise<GuildSettings> => {
    const baseSettings = defaultGuildSettings(guildId);
    return {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        levelingEnabled
      }
    };
  });

  return {
    init: vi.fn().mockResolvedValue(undefined),
    findByGuildId,
    upsert: vi.fn().mockResolvedValue(undefined),
    patch: vi.fn(async (guildId: string) => defaultGuildSettings(guildId)),
    nextModerationCaseNumber: vi.fn().mockResolvedValue(1)
  };
};

describe("GrantVoiceXpHandler", () => {
  it("crea perfil faltante al procesar voz y guarda historial del calculo", async () => {
    const repository = new InMemoryLevelProfileRepository();
    const historyRepository = new InMemoryVoiceXpHistoryRepository();
    const eventBus = new InMemoryEventBus(new PinoLogger("silent"));

    const handler = new GrantVoiceXpHandler(
      repository,
      new LevelPolicy(),
      eventBus,
      buildGuildSettingsRepository(true),
      historyRepository
    );

    await handler.handle(
      new GrantVoiceXpCommand({
        guildId: "guild-1",
        channelId: "voice-1",
        userId: "user-1",
        sessionStartedAt: new Date("2026-03-17T10:00:00.000Z"),
        sessionEndedAt: new Date("2026-03-17T10:31:00.000Z"),
        participationMs: 31 * 60_000,
        xpPerMinute: 2,
        maxMinutesPerSession: 180
      })
    );

    const profile = await repository.findByGuildAndUser("guild-1", "user-1");
    expect(profile).not.toBeNull();
    expect(profile?.xp).toBe(62);

    expect(historyRepository.entries).toHaveLength(1);
    expect(historyRepository.entries[0]).toMatchObject({
      guildId: "guild-1",
      channelId: "voice-1",
      userId: "user-1",
      requestedMinutes: 31,
      effectiveMinutes: 31,
      calculatedXp: 62,
      grantedXp: 62,
      profileCreated: true,
      outcome: "granted"
    });
  });

  it("guarda historial aunque leveling este desactivado", async () => {
    const repository = new InMemoryLevelProfileRepository();
    await repository.createIfMissing("guild-2", "user-2");

    const historyRepository = new InMemoryVoiceXpHistoryRepository();
    const eventBus = new InMemoryEventBus(new PinoLogger("silent"));

    const handler = new GrantVoiceXpHandler(
      repository,
      new LevelPolicy(),
      eventBus,
      buildGuildSettingsRepository(false),
      historyRepository
    );

    await handler.handle(
      new GrantVoiceXpCommand({
        guildId: "guild-2",
        channelId: "voice-2",
        userId: "user-2",
        sessionStartedAt: new Date("2026-03-17T12:00:00.000Z"),
        sessionEndedAt: new Date("2026-03-17T12:10:00.000Z"),
        participationMs: 10 * 60_000,
        xpPerMinute: 2,
        maxMinutesPerSession: 180
      })
    );

    const profile = await repository.findByGuildAndUser("guild-2", "user-2");
    expect(profile?.xp).toBe(0);

    expect(historyRepository.entries).toHaveLength(1);
    expect(historyRepository.entries[0]).toMatchObject({
      calculatedXp: 20,
      grantedXp: 0,
      outcome: "skipped-leveling-disabled"
    });
  });

  it("registra calculo sin otorgar XP cuando la sesion dura menos de un minuto", async () => {
    const repository = new InMemoryLevelProfileRepository();
    await repository.createIfMissing("guild-3", "user-3");

    const historyRepository = new InMemoryVoiceXpHistoryRepository();
    const eventBus = new InMemoryEventBus(new PinoLogger("silent"));

    const handler = new GrantVoiceXpHandler(
      repository,
      new LevelPolicy(),
      eventBus,
      buildGuildSettingsRepository(true),
      historyRepository
    );

    await handler.handle(
      new GrantVoiceXpCommand({
        guildId: "guild-3",
        channelId: "voice-3",
        userId: "user-3",
        sessionStartedAt: new Date("2026-03-17T13:00:00.000Z"),
        sessionEndedAt: new Date("2026-03-17T13:00:30.000Z"),
        participationMs: 30_000,
        xpPerMinute: 2,
        maxMinutesPerSession: 180
      })
    );

    const profile = await repository.findByGuildAndUser("guild-3", "user-3");
    expect(profile?.xp).toBe(0);

    expect(historyRepository.entries).toHaveLength(1);
    expect(historyRepository.entries[0]).toMatchObject({
      requestedMinutes: 0,
      effectiveMinutes: 0,
      calculatedXp: 0,
      grantedXp: 0,
      outcome: "skipped-no-xp"
    });
  });
});

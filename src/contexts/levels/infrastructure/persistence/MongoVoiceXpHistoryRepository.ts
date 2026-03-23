import { Collection, type Db } from "mongodb";

import type { VoiceXpHistoryRepository } from "@contexts/levels/application/ports/VoiceXpHistoryRepository";
import type { VoiceXpHistoryEntry } from "@contexts/levels/domain/VoiceXpHistoryEntry";

interface VoiceXpHistoryDocument {
  guildId: string;
  channelId: string;
  userId: string;
  sessionStartedAt: Date;
  sessionEndedAt: Date;
  participationMs: number;
  requestedMinutes: number;
  effectiveMinutes: number;
  xpPerMinute: number;
  maxMinutesPerSession: number;
  calculatedXp: number;
  grantedXp: number;
  profileCreated: boolean;
  previousXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  outcome: VoiceXpHistoryEntry["outcome"];
  createdAt: Date;
}

export class MongoVoiceXpHistoryRepository implements VoiceXpHistoryRepository {
  private readonly collection: Collection<VoiceXpHistoryDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<VoiceXpHistoryDocument>("voice_xp_history");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, userId: 1, createdAt: -1 });
    await this.collection.createIndex({ guildId: 1, channelId: 1, createdAt: -1 });
    await this.collection.createIndex({ createdAt: -1 });
  }

  public async append(entry: VoiceXpHistoryEntry): Promise<void> {
    await this.collection.insertOne({
      guildId: entry.guildId,
      channelId: entry.channelId,
      userId: entry.userId,
      sessionStartedAt: entry.sessionStartedAt,
      sessionEndedAt: entry.sessionEndedAt,
      participationMs: entry.participationMs,
      requestedMinutes: entry.requestedMinutes,
      effectiveMinutes: entry.effectiveMinutes,
      xpPerMinute: entry.xpPerMinute,
      maxMinutesPerSession: entry.maxMinutesPerSession,
      calculatedXp: entry.calculatedXp,
      grantedXp: entry.grantedXp,
      profileCreated: entry.profileCreated,
      previousXp: entry.previousXp,
      newXp: entry.newXp,
      previousLevel: entry.previousLevel,
      newLevel: entry.newLevel,
      outcome: entry.outcome,
      createdAt: entry.createdAt
    });
  }
}

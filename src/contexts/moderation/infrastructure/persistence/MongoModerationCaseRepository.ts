import { Collection, type Db } from "mongodb";

import type { ModerationCase } from "@contexts/moderation/domain/ModerationCase";
import type { ModerationCaseRepository } from "@contexts/moderation/application/ports/ModerationCaseRepository";

interface ModerationCaseDocument {
  guildId: string;
  caseNumber: number;
  actionType: ModerationCase["actionType"];
  targetUserId?: string;
  moderatorUserId: string;
  reason: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  status: ModerationCase["status"];
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: ModerationCaseDocument): ModerationCase => ({
  guildId: doc.guildId,
  caseNumber: doc.caseNumber,
  actionType: doc.actionType,
  targetUserId: doc.targetUserId,
  moderatorUserId: doc.moderatorUserId,
  reason: doc.reason,
  durationMs: doc.durationMs,
  metadata: doc.metadata,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoModerationCaseRepository implements ModerationCaseRepository {
  private readonly collection: Collection<ModerationCaseDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<ModerationCaseDocument>("moderation_cases");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, caseNumber: 1 }, { unique: true });
    await this.collection.createIndex({ guildId: 1, targetUserId: 1, createdAt: -1 });
    await this.collection.createIndex({ guildId: 1, actionType: 1, createdAt: -1 });
    await this.collection.createIndex({ createdAt: -1 });
  }

  public async create(caseRecord: ModerationCase): Promise<void> {
    await this.collection.insertOne({
      guildId: caseRecord.guildId,
      caseNumber: caseRecord.caseNumber,
      actionType: caseRecord.actionType,
      targetUserId: caseRecord.targetUserId,
      moderatorUserId: caseRecord.moderatorUserId,
      reason: caseRecord.reason,
      durationMs: caseRecord.durationMs,
      metadata: caseRecord.metadata,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
      updatedAt: caseRecord.updatedAt
    });
  }

  public async findByGuildAndCaseNumber(
    guildId: string,
    caseNumber: number
  ): Promise<ModerationCase | null> {
    const doc = await this.collection.findOne({ guildId, caseNumber });
    return doc ? toDomain(doc) : null;
  }
}

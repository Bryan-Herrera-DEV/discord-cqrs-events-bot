import { Collection, type Db } from "mongodb";

import type { ModerationAction } from "@contexts/moderation/domain/ModerationAction";
import type { ModerationActionRepository } from "@contexts/moderation/application/ports/ModerationActionRepository";

interface ModerationActionDocument {
  guildId: string;
  caseNumber: number;
  actionType: ModerationAction["actionType"];
  actorUserId: string;
  targetUserId?: string;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const toDomain = (doc: ModerationActionDocument): ModerationAction => ({
  guildId: doc.guildId,
  caseNumber: doc.caseNumber,
  actionType: doc.actionType,
  actorUserId: doc.actorUserId,
  targetUserId: doc.targetUserId,
  reason: doc.reason,
  metadata: doc.metadata,
  createdAt: doc.createdAt
});

export class MongoModerationActionRepository implements ModerationActionRepository {
  private readonly collection: Collection<ModerationActionDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<ModerationActionDocument>("moderation_actions");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, caseNumber: 1, createdAt: 1 });
    await this.collection.createIndex({ guildId: 1, targetUserId: 1, createdAt: -1 });
    await this.collection.createIndex({ createdAt: -1 });
  }

  public async append(action: ModerationAction): Promise<void> {
    await this.collection.insertOne({
      guildId: action.guildId,
      caseNumber: action.caseNumber,
      actionType: action.actionType,
      actorUserId: action.actorUserId,
      targetUserId: action.targetUserId,
      reason: action.reason,
      metadata: action.metadata,
      createdAt: action.createdAt
    });
  }

  public async findByGuildAndCaseNumber(guildId: string, caseNumber: number): Promise<ModerationAction[]> {
    const docs = await this.collection.find({ guildId, caseNumber }).sort({ createdAt: 1 }).toArray();
    return docs.map(toDomain);
  }
}

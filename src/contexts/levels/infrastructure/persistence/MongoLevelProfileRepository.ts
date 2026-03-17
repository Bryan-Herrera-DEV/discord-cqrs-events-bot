import { Collection, type Db } from "mongodb";

import {
  createInitialLevelProfile,
  type LevelProfile
} from "@contexts/levels/domain/LevelProfile";
import type {
  LeaderboardEntry,
  LevelProfileRepository
} from "@contexts/levels/application/ports/LevelProfileRepository";

interface LevelProfileDocument {
  guildId: string;
  userId: string;
  level: number;
  xp: number;
  totalMessages: number;
  lastXpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: LevelProfileDocument): LevelProfile => ({
  guildId: doc.guildId,
  userId: doc.userId,
  level: doc.level,
  xp: doc.xp,
  totalMessages: doc.totalMessages,
  lastXpAt: doc.lastXpAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoLevelProfileRepository implements LevelProfileRepository {
  private readonly collection: Collection<LevelProfileDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<LevelProfileDocument>("level_profiles");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, userId: 1 }, { unique: true });
    await this.collection.createIndex({ guildId: 1, xp: -1 });
    await this.collection.createIndex({ guildId: 1, level: -1 });
    await this.collection.createIndex({ updatedAt: -1 });
  }

  public async createIfMissing(guildId: string, userId: string): Promise<void> {
    const initial = createInitialLevelProfile(guildId, userId);
    await this.collection.updateOne(
      { guildId, userId },
      {
        $setOnInsert: {
          ...initial
        }
      },
      { upsert: true }
    );
  }

  public async findByGuildAndUser(guildId: string, userId: string): Promise<LevelProfile | null> {
    const result = await this.collection.findOne({ guildId, userId });
    return result ? toDomain(result) : null;
  }

  public async save(profile: LevelProfile): Promise<void> {
    await this.collection.updateOne(
      { guildId: profile.guildId, userId: profile.userId },
      {
        $set: {
          level: profile.level,
          xp: profile.xp,
          totalMessages: profile.totalMessages,
          lastXpAt: profile.lastXpAt,
          updatedAt: profile.updatedAt
        },
        $setOnInsert: {
          createdAt: profile.createdAt
        }
      },
      { upsert: true }
    );
  }

  public async topByGuild(guildId: string, limit: number): Promise<LeaderboardEntry[]> {
    const docs = await this.collection
      .find({ guildId })
      .sort({ xp: -1, updatedAt: 1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => ({
      userId: doc.userId,
      xp: doc.xp,
      level: doc.level,
      totalMessages: doc.totalMessages
    }));
  }

  public async rankByGuild(guildId: string, userId: string): Promise<number | null> {
    const profile = await this.collection.findOne({ guildId, userId });
    if (!profile) {
      return null;
    }

    const better = await this.collection.countDocuments({
      guildId,
      $or: [{ xp: { $gt: profile.xp } }, { xp: profile.xp, updatedAt: { $lt: profile.updatedAt } }]
    });

    return better + 1;
  }
}

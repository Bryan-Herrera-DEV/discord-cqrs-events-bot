import { Collection, type Db } from "mongodb";

import type { MemberProfile } from "@contexts/members/domain/MemberProfile";
import type { MemberProfileRepository } from "@contexts/members/application/ports/MemberProfileRepository";

interface MemberProfileDocument {
  guildId: string;
  userId: string;
  username: string;
  globalName?: string;
  displayName: string;
  avatarUrl?: string;
  bot: boolean;
  initialRoleIds: string[];
  joinedAt: Date;
  leftAt?: Date;
  lastSeenAt: Date;
  onboarding: MemberProfile["onboarding"];
  metadata: MemberProfile["metadata"];
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: MemberProfileDocument): MemberProfile => ({
  guildId: doc.guildId,
  userId: doc.userId,
  username: doc.username,
  globalName: doc.globalName,
  displayName: doc.displayName,
  avatarUrl: doc.avatarUrl,
  bot: doc.bot,
  initialRoleIds: doc.initialRoleIds,
  joinedAt: doc.joinedAt,
  lastSeenAt: doc.lastSeenAt,
  onboarding: doc.onboarding,
  metadata: doc.metadata,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoMemberProfileRepository implements MemberProfileRepository {
  private readonly collection: Collection<MemberProfileDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<MemberProfileDocument>("member_profiles");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1, userId: 1 }, { unique: true });
    await this.collection.createIndex({ guildId: 1, joinedAt: -1 });
    await this.collection.createIndex({ guildId: 1, "onboarding.stage": 1 });
    await this.collection.createIndex({ bot: 1, guildId: 1 });
  }

  public async save(profile: MemberProfile): Promise<void> {
    await this.collection.updateOne(
      {
        guildId: profile.guildId,
        userId: profile.userId
      },
      {
        $set: {
          username: profile.username,
          globalName: profile.globalName,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          bot: profile.bot,
          initialRoleIds: profile.initialRoleIds,
          joinedAt: profile.joinedAt,
          lastSeenAt: profile.lastSeenAt,
          onboarding: profile.onboarding,
          metadata: profile.metadata,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: profile.createdAt
        }
      },
      { upsert: true }
    );
  }

  public async findByGuildAndUser(guildId: string, userId: string): Promise<MemberProfile | null> {
    const result = await this.collection.findOne({ guildId, userId });
    return result ? toDomain(result) : null;
  }

  public async markLeft(guildId: string, userId: string, leftAt: Date): Promise<void> {
    await this.collection.updateOne(
      { guildId, userId },
      {
        $set: {
          updatedAt: new Date(),
          leftAt,
          "onboarding.stage": "completed",
          "onboarding.completedAt": leftAt
        }
      }
    );
  }
}

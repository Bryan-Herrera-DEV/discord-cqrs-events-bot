import { Collection, type Db } from "mongodb";

import type { GuildRepository } from "@contexts/guilds/application/ports/GuildRepository";
import type { Guild } from "@contexts/guilds/domain/Guild";

interface GuildDocument {
  guildId: string;
  name: string;
  ownerId?: string;
  active: boolean;
  joinedAt: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: GuildDocument): Guild => ({
  guildId: doc.guildId,
  name: doc.name,
  ownerId: doc.ownerId,
  active: doc.active,
  joinedAt: doc.joinedAt,
  leftAt: doc.leftAt,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoGuildRepository implements GuildRepository {
  private readonly collection: Collection<GuildDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<GuildDocument>("guilds");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
    await this.collection.createIndex({ active: 1, updatedAt: -1 });
  }

  public async upsert(guild: Guild): Promise<void> {
    await this.collection.updateOne(
      { guildId: guild.guildId },
      {
        $set: {
          name: guild.name,
          ownerId: guild.ownerId,
          active: true,
          joinedAt: guild.joinedAt,
          updatedAt: new Date(),
          leftAt: undefined
        },
        $setOnInsert: {
          createdAt: guild.createdAt
        }
      },
      { upsert: true }
    );
  }

  public async markInactive(guildId: string, leftAt: Date): Promise<void> {
    await this.collection.updateOne(
      { guildId },
      {
        $set: {
          active: false,
          leftAt,
          updatedAt: new Date()
        }
      }
    );
  }

  public async findByGuildId(guildId: string): Promise<Guild | null> {
    const doc = await this.collection.findOne({ guildId });
    return doc ? toDomain(doc) : null;
  }
}

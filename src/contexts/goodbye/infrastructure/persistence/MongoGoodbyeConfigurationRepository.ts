import { Collection, type Db } from "mongodb";

import type { GoodbyeConfiguration } from "@contexts/goodbye/domain/GoodbyeConfiguration";
import type { GoodbyeConfigurationRepository } from "@contexts/goodbye/application/ports/GoodbyeConfigurationRepository";

interface GoodbyeConfigurationDocument {
  guildId: string;
  enabled: boolean;
  channelId?: string;
  template: string;
  accentColor: number;
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: GoodbyeConfigurationDocument): GoodbyeConfiguration => ({
  guildId: doc.guildId,
  enabled: doc.enabled,
  channelId: doc.channelId,
  template: doc.template,
  accentColor: doc.accentColor,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoGoodbyeConfigurationRepository implements GoodbyeConfigurationRepository {
  private readonly collection: Collection<GoodbyeConfigurationDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<GoodbyeConfigurationDocument>("goodbye_configurations");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
    await this.collection.createIndex({ enabled: 1, guildId: 1 });
    await this.collection.createIndex({ updatedAt: -1 });
  }

  public async findByGuildId(guildId: string): Promise<GoodbyeConfiguration | null> {
    const doc = await this.collection.findOne({ guildId });
    return doc ? toDomain(doc) : null;
  }

  public async upsert(configuration: GoodbyeConfiguration): Promise<void> {
    await this.collection.updateOne(
      { guildId: configuration.guildId },
      {
        $set: {
          enabled: configuration.enabled,
          channelId: configuration.channelId,
          template: configuration.template,
          accentColor: configuration.accentColor,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: configuration.createdAt
        }
      },
      { upsert: true }
    );
  }
}

import { Collection, type Db } from "mongodb";

import type { WelcomeConfiguration } from "@contexts/welcome/domain/WelcomeConfiguration";
import type { WelcomeConfigurationRepository } from "@contexts/welcome/application/ports/WelcomeConfigurationRepository";

interface WelcomeConfigurationDocument {
  guildId: string;
  enabled: boolean;
  channelId?: string;
  template: string;
  useImage: boolean;
  branding: WelcomeConfiguration["branding"];
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: WelcomeConfigurationDocument): WelcomeConfiguration => ({
  guildId: doc.guildId,
  enabled: doc.enabled,
  channelId: doc.channelId,
  template: doc.template,
  useImage: doc.useImage,
  branding: doc.branding,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoWelcomeConfigurationRepository implements WelcomeConfigurationRepository {
  private readonly collection: Collection<WelcomeConfigurationDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<WelcomeConfigurationDocument>("welcome_configurations");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
    await this.collection.createIndex({ enabled: 1, guildId: 1 });
    await this.collection.createIndex({ updatedAt: -1 });
  }

  public async findByGuildId(guildId: string): Promise<WelcomeConfiguration | null> {
    const doc = await this.collection.findOne({ guildId });
    return doc ? toDomain(doc) : null;
  }

  public async upsert(configuration: WelcomeConfiguration): Promise<void> {
    await this.collection.updateOne(
      { guildId: configuration.guildId },
      {
        $set: {
          enabled: configuration.enabled,
          channelId: configuration.channelId,
          template: configuration.template,
          useImage: configuration.useImage,
          branding: configuration.branding,
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

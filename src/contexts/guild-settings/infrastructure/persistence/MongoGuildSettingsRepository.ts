import { Collection, type Db } from "mongodb";

import {
  defaultGuildSettings,
  type GuildSettings
} from "@contexts/guild-settings/domain/GuildSettings";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";

interface GuildSettingsDocument {
  guildId: string;
  language: string;
  featureFlags: GuildSettings["featureFlags"];
  channels: GuildSettings["channels"];
  permissionPolicies: GuildSettings["permissionPolicies"];
  moderationCaseSequence: number;
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: GuildSettingsDocument): GuildSettings => ({
  guildId: doc.guildId,
  language: doc.language,
  featureFlags: doc.featureFlags,
  channels: doc.channels,
  permissionPolicies: doc.permissionPolicies,
  moderationCaseSequence: doc.moderationCaseSequence,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoGuildSettingsRepository implements GuildSettingsRepository {
  private readonly collection: Collection<GuildSettingsDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<GuildSettingsDocument>("guild_settings");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
    await this.collection.createIndex({ "featureFlags.moderationEnabled": 1, guildId: 1 });
    await this.collection.createIndex({ updatedAt: -1 });
  }

  public async findByGuildId(guildId: string): Promise<GuildSettings | null> {
    const result = await this.collection.findOne({ guildId });
    return result ? toDomain(result) : null;
  }

  public async upsert(settings: GuildSettings): Promise<void> {
    await this.collection.updateOne(
      { guildId: settings.guildId },
      {
        $set: {
          language: settings.language,
          featureFlags: settings.featureFlags,
          channels: settings.channels,
          permissionPolicies: settings.permissionPolicies,
          moderationCaseSequence: settings.moderationCaseSequence,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: settings.createdAt
        }
      },
      { upsert: true }
    );
  }

  public async patch(
    guildId: string,
    patch: Partial<Omit<GuildSettings, "guildId" | "createdAt" | "updatedAt">>
  ): Promise<GuildSettings> {
    const existing = (await this.findByGuildId(guildId)) ?? defaultGuildSettings(guildId);
    const merged: GuildSettings = {
      ...existing,
      ...patch,
      channels: {
        ...existing.channels,
        ...(patch.channels ?? {})
      },
      featureFlags: {
        ...existing.featureFlags,
        ...(patch.featureFlags ?? {})
      },
      permissionPolicies: {
        ...existing.permissionPolicies,
        ...(patch.permissionPolicies ?? {})
      },
      updatedAt: new Date()
    };

    await this.upsert(merged);
    return merged;
  }

  public async nextModerationCaseNumber(guildId: string): Promise<number> {
    const now = new Date();
    const defaults = defaultGuildSettings(guildId);
    const result = await this.collection.findOneAndUpdate(
      { guildId },
      {
        $inc: { moderationCaseSequence: 1 },
        $set: { updatedAt: now },
        $setOnInsert: {
          guildId: defaults.guildId,
          language: defaults.language,
          featureFlags: defaults.featureFlags,
          channels: defaults.channels,
          permissionPolicies: defaults.permissionPolicies,
          createdAt: now
        }
      },
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    if (!result) {
      throw new Error("No se pudo generar case number");
    }

    return result.moderationCaseSequence;
  }
}

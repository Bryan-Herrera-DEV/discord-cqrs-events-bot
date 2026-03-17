import { Collection, type Db } from "mongodb";

import {
  defaultRoleConfiguration,
  type RoleConfiguration
} from "@contexts/roles/domain/RoleConfiguration";
import type { RoleConfigurationRepository } from "@contexts/roles/application/ports/RoleConfigurationRepository";

interface RoleConfigurationDocument {
  guildId: string;
  configurableRoleIds: string[];
  autoRoleIds: string[];
  reactionRoleConfigurations: RoleConfiguration["reactionRoleConfigurations"];
  createdAt: Date;
  updatedAt: Date;
}

const toDomain = (doc: RoleConfigurationDocument): RoleConfiguration => ({
  guildId: doc.guildId,
  configurableRoleIds: doc.configurableRoleIds,
  autoRoleIds: doc.autoRoleIds,
  reactionRoleConfigurations: doc.reactionRoleConfigurations,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

export class MongoRoleConfigurationRepository implements RoleConfigurationRepository {
  private readonly collection: Collection<RoleConfigurationDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<RoleConfigurationDocument>("role_configurations");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ guildId: 1 }, { unique: true });
    await this.collection.createIndex({ configurableRoleIds: 1, guildId: 1 });
    await this.collection.createIndex({ updatedAt: -1 });
  }

  public async findByGuildId(guildId: string): Promise<RoleConfiguration | null> {
    const doc = await this.collection.findOne({ guildId });
    return doc ? toDomain(doc) : null;
  }

  public async upsert(configuration: RoleConfiguration): Promise<void> {
    await this.collection.updateOne(
      { guildId: configuration.guildId },
      {
        $set: {
          configurableRoleIds: configuration.configurableRoleIds,
          autoRoleIds: configuration.autoRoleIds,
          reactionRoleConfigurations: configuration.reactionRoleConfigurations,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: configuration.createdAt
        }
      },
      { upsert: true }
    );
  }

  public async removeRoleFromConfiguration(guildId: string, roleId: string): Promise<void> {
    const existing = (await this.findByGuildId(guildId)) ?? defaultRoleConfiguration(guildId);
    existing.configurableRoleIds = existing.configurableRoleIds.filter((configured) => configured !== roleId);
    existing.autoRoleIds = existing.autoRoleIds.filter((configured) => configured !== roleId);
    existing.reactionRoleConfigurations = existing.reactionRoleConfigurations.filter(
      (configured) => configured.roleId !== roleId
    );
    existing.updatedAt = new Date();
    await this.upsert(existing);
  }
}

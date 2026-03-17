import { Collection, type Db } from "mongodb";

import type {
  CommandIdempotencyStore,
  IdempotencyBeginResult
} from "@shared/infrastructure/idempotency/CommandIdempotencyStore";

interface CommandIdempotencyDocument {
  key: string;
  commandName: string;
  status: "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  reason?: string;
}

export class MongoCommandIdempotencyStore implements CommandIdempotencyStore {
  private readonly collection: Collection<CommandIdempotencyDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<CommandIdempotencyDocument>("command_idempotency");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ key: 1 }, { unique: true });
    await this.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.collection.createIndex({ commandName: 1, createdAt: -1 });
  }

  public async begin(
    key: string,
    ttlSeconds: number,
    commandName: string
  ): Promise<IdempotencyBeginResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const existing = await this.collection.findOne({ key });
    if (existing?.status === "completed") {
      return "already_processed";
    }
    if (existing?.status === "processing") {
      return "in_progress";
    }

    await this.collection.updateOne(
      { key },
      {
        $set: {
          commandName,
          status: "processing",
          updatedAt: now,
          expiresAt
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );

    return "started";
  }

  public async complete(key: string): Promise<void> {
    await this.collection.updateOne(
      { key },
      {
        $set: {
          status: "completed",
          updatedAt: new Date()
        }
      }
    );
  }

  public async fail(key: string, reason: string): Promise<void> {
    await this.collection.updateOne(
      { key },
      {
        $set: {
          status: "failed",
          updatedAt: new Date(),
          reason
        }
      }
    );
  }
}

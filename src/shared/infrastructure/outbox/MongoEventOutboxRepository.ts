import { Collection, type Db } from "mongodb";

import type { DomainEvent } from "@shared/domain/DomainEvent";

interface EventOutboxDocument {
  eventId: string;
  eventName: string;
  payload: unknown;
  metadata?: Record<string, string>;
  occurredAt: Date;
  status: "pending" | "published";
  createdAt: Date;
  updatedAt: Date;
}

export class MongoEventOutboxRepository {
  private readonly collection: Collection<EventOutboxDocument>;

  public constructor(db: Db) {
    this.collection = db.collection<EventOutboxDocument>("event_outbox");
  }

  public async init(): Promise<void> {
    await this.collection.createIndex({ eventId: 1 }, { unique: true });
    await this.collection.createIndex({ status: 1, createdAt: 1 });
  }

  public async append(event: DomainEvent): Promise<void> {
    await this.collection.insertOne({
      eventId: event.id,
      eventName: event.name,
      payload: event.payload,
      metadata: event.metadata,
      occurredAt: event.occurredAt,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  public async markPublished(eventId: string): Promise<void> {
    await this.collection.updateOne(
      { eventId },
      {
        $set: {
          status: "published",
          updatedAt: new Date()
        }
      }
    );
  }
}

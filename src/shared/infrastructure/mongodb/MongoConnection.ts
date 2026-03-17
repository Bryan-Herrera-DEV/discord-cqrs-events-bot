import { Db, MongoClient } from "mongodb";

import type { Logger } from "@shared/infrastructure/logger/Logger";

export class MongoConnection {
  private client?: MongoClient;
  private db?: Db;

  public constructor(
    private readonly uri: string,
    private readonly dbName: string,
    private readonly logger: Logger
  ) {}

  public async connect(): Promise<void> {
    if (this.client) {
      return;
    }
    this.client = new MongoClient(this.uri);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.logger.info("mongo.connected", { dbName: this.dbName });
  }

  public getDatabase(): Db {
    if (!this.db) {
      throw new Error("MongoConnection no inicializada");
    }
    return this.db;
  }

  public async ping(): Promise<boolean> {
    try {
      await this.getDatabase().command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }
    await this.client.close();
    this.client = undefined;
    this.db = undefined;
  }
}

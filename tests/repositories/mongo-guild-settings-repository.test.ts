import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

import { MongoConnection } from "@shared/infrastructure/mongodb/MongoConnection";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";
import { MongoGuildSettingsRepository } from "@contexts/guild-settings/infrastructure/persistence/MongoGuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

describe("MongoGuildSettingsRepository", () => {
  let server: MongoMemoryServer;
  let connection: MongoConnection;
  let repository: MongoGuildSettingsRepository;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    connection = new MongoConnection(server.getUri(), "test-db", new PinoLogger("silent"));
    await connection.connect();
    repository = new MongoGuildSettingsRepository(connection.getDatabase());
    await repository.init();
  });

  afterAll(async () => {
    await connection.disconnect();
    await server.stop();
  });

  it("upsert y lectura por guild funcionan", async () => {
    const settings = defaultGuildSettings("123456789012345678");
    settings.channels.logsChannelId = "111111111111111111";

    await repository.upsert(settings);
    const loaded = await repository.findByGuildId(settings.guildId);

    expect(loaded).not.toBeNull();
    expect(loaded?.channels.logsChannelId).toBe("111111111111111111");
  });

  it("incrementa correlativo de casos de moderación", async () => {
    const guildId = "222222222222222222";
    const first = await repository.nextModerationCaseNumber(guildId);
    const second = await repository.nextModerationCaseNumber(guildId);

    expect(first).toBe(1);
    expect(second).toBe(2);
  });
});

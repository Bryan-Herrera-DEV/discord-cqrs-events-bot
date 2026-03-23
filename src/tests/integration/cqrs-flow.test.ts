import { describe, expect, it } from "vitest";

import { InMemoryCommandBus } from "@shared/application/CommandBus";
import { InMemoryQueryBus } from "@shared/application/QueryBus";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";
import { InitializeLevelProfileCommand } from "@contexts/levels/application/commands/InitializeLevelProfileCommand";
import { InitializeLevelProfileHandler } from "@contexts/levels/application/commands/InitializeLevelProfileHandler";
import { GetMyLevelQuery } from "@contexts/levels/application/queries/GetMyLevelQuery";
import { GetMyLevelHandler } from "@contexts/levels/application/queries/GetMyLevelHandler";
import type {
  LeaderboardEntry,
  LevelProfileRepository
} from "@contexts/levels/application/ports/LevelProfileRepository";
import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import type { LevelProfile } from "@contexts/levels/domain/LevelProfile";
import type { MyLevelView } from "@contexts/levels/application/queries/GetMyLevelQuery";

class InMemoryLevelRepository implements LevelProfileRepository {
  private readonly store = new Map<string, LevelProfile>();

  public async init(): Promise<void> {}

  public async createIfMissing(guildId: string, userId: string): Promise<void> {
    const key = `${guildId}:${userId}`;
    if (!this.store.has(key)) {
      this.store.set(key, {
        guildId,
        userId,
        level: 1,
        xp: 0,
        totalMessages: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  public async findByGuildAndUser(guildId: string, userId: string): Promise<LevelProfile | null> {
    return this.store.get(`${guildId}:${userId}`) ?? null;
  }

  public async save(profile: LevelProfile): Promise<void> {
    this.store.set(`${profile.guildId}:${profile.userId}`, profile);
  }

  public async topByGuild(_guildId: string, _limit: number): Promise<LeaderboardEntry[]> {
    return [];
  }

  public async rankByGuild(_guildId: string, _userId: string): Promise<number | null> {
    return 1;
  }
}

describe("CQRS flow", () => {
  it("ejecuta command y luego query sobre el mismo contexto", async () => {
    const logger = new PinoLogger("silent");
    const commandBus = new InMemoryCommandBus(logger);
    const queryBus = new InMemoryQueryBus(logger);

    const repository = new InMemoryLevelRepository();
    commandBus.register(
      InitializeLevelProfileCommand.type,
      new InitializeLevelProfileHandler(repository)
    );
    queryBus.register(GetMyLevelQuery.type, new GetMyLevelHandler(repository, new LevelPolicy()));

    const guildId = "123456789012345678";
    const userId = "987654321098765432";

    await commandBus.execute(
      new InitializeLevelProfileCommand({
        guildId,
        userId
      })
    );

    const result = await queryBus.execute<MyLevelView | null>(
      new GetMyLevelQuery({
        guildId,
        userId
      })
    );

    expect(result).not.toBeNull();
    expect(result?.level).toBe(1);
    expect(result?.xp).toBe(0);
  });
});

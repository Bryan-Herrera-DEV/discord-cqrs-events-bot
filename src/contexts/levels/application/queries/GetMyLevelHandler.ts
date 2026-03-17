import type { QueryHandler } from "@shared/application/QueryBus";

import type { LevelProfileRepository } from "@contexts/levels/application/ports/LevelProfileRepository";
import type { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { GetMyLevelQuery, type MyLevelView } from "@contexts/levels/application/queries/GetMyLevelQuery";

export class GetMyLevelHandler implements QueryHandler<GetMyLevelQuery, MyLevelView | null> {
  public constructor(
    private readonly repository: LevelProfileRepository,
    private readonly levelPolicy: LevelPolicy
  ) {}

  public async handle(query: GetMyLevelQuery): Promise<MyLevelView | null> {
    const profile = await this.repository.findByGuildAndUser(query.payload.guildId, query.payload.userId);
    if (!profile) {
      return null;
    }
    const rank = await this.repository.rankByGuild(query.payload.guildId, query.payload.userId);
    return {
      guildId: query.payload.guildId,
      userId: query.payload.userId,
      level: profile.level,
      xp: profile.xp,
      xpToNextLevel: this.levelPolicy.xpToNextLevel(profile.xp),
      rank,
      totalMessages: profile.totalMessages
    };
  }
}

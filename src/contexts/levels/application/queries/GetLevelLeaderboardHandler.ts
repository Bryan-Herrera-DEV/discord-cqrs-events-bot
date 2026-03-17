import type { QueryHandler } from "@shared/application/QueryBus";

import type { LevelProfileRepository, LeaderboardEntry } from "@contexts/levels/application/ports/LevelProfileRepository";
import { GetLevelLeaderboardQuery } from "@contexts/levels/application/queries/GetLevelLeaderboardQuery";

export class GetLevelLeaderboardHandler
  implements QueryHandler<GetLevelLeaderboardQuery, LeaderboardEntry[]>
{
  public constructor(private readonly repository: LevelProfileRepository) {}

  public async handle(query: GetLevelLeaderboardQuery): Promise<LeaderboardEntry[]> {
    return this.repository.topByGuild(query.payload.guildId, query.payload.limit);
  }
}

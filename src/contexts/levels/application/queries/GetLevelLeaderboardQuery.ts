import type { Query } from "@shared/application/QueryBus";

import type { LeaderboardEntry } from "@contexts/levels/application/ports/LevelProfileRepository";

export class GetLevelLeaderboardQuery implements Query<LeaderboardEntry[]> {
  public static readonly type = "levels.get-leaderboard";
  public readonly type = GetLevelLeaderboardQuery.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      limit: number;
    }
  ) {}
}

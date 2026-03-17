import type { Query } from "@shared/application/QueryBus";

export interface MyLevelView {
  guildId: string;
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rank: number | null;
  totalMessages: number;
}

export class GetMyLevelQuery implements Query<MyLevelView | null> {
  public static readonly type = "levels.get-my-level";
  public readonly type = GetMyLevelQuery.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      userId: string;
    }
  ) {}
}

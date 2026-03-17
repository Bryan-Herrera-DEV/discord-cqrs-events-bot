import type { Command } from "@shared/application/CommandBus";

export class GrantMessageXpCommand implements Command<void> {
  public static readonly type = "levels.grant-message-xp";
  public readonly type = GrantMessageXpCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      userId: string;
      minXpGain: number;
      maxXpGain: number;
      cooldownSeconds: number;
    }
  ) {}
}

import type { Command } from "@shared/application/CommandBus";

export class InitializeLevelProfileCommand implements Command<void> {
  public static readonly type = "levels.initialize-profile";
  public readonly type = InitializeLevelProfileCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      userId: string;
    }
  ) {}
}

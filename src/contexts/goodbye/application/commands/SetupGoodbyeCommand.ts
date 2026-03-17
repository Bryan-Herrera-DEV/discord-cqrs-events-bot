import type { Command } from "@shared/application/CommandBus";

export class SetupGoodbyeCommand implements Command<void> {
  public static readonly type = "goodbye.setup";
  public readonly type = SetupGoodbyeCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      changedBy: string;
      channelId?: string;
      template?: string;
      enabled?: boolean;
    }
  ) {}
}

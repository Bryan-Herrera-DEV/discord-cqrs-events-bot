import type { Command } from "@shared/application/CommandBus";

export class ToggleGoodbyeCommand implements Command<void> {
  public static readonly type = "goodbye.toggle";
  public readonly type = ToggleGoodbyeCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      changedBy: string;
      enabled: boolean;
    }
  ) {}
}

import type { Command } from "@shared/application/CommandBus";

export class RegisterGuildCommand implements Command<void> {
  public static readonly type = "guilds.register";
  public readonly type = RegisterGuildCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      name: string;
      ownerId?: string;
    }
  ) {}
}

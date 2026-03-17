import type { Command } from "@shared/application/CommandBus";

export class MarkGuildRemovedCommand implements Command<void> {
  public static readonly type = "guilds.mark-removed";
  public readonly type = MarkGuildRemovedCommand.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

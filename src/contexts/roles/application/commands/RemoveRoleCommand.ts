import type { Command } from "@shared/application/CommandBus";

export class RemoveRoleCommand implements Command<void> {
  public static readonly type = "roles.remove";
  public readonly type = RemoveRoleCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      actorUserId: string;
      targetUserId: string;
      roleId: string;
      reason: string;
    }
  ) {}
}

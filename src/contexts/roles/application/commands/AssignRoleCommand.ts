import type { Command } from "@shared/application/CommandBus";

export class AssignRoleCommand implements Command<void> {
  public static readonly type = "roles.assign";
  public readonly type = AssignRoleCommand.type;

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

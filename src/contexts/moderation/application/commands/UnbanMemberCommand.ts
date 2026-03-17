import type { Command } from "@shared/application/CommandBus";

export interface UnbanMemberResult {
  caseNumber: number;
}

export class UnbanMemberCommand implements Command<UnbanMemberResult> {
  public static readonly type = "moderation.unban";
  public readonly type = UnbanMemberCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      targetUserId: string;
      reason: string;
    }
  ) {}
}

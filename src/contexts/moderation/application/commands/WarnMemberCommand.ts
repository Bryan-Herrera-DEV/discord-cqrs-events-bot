import type { Command } from "@shared/application/CommandBus";

export interface WarnMemberResult {
  caseNumber: number;
}

export class WarnMemberCommand implements Command<WarnMemberResult> {
  public static readonly type = "moderation.warn";
  public readonly type = WarnMemberCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      targetUserId: string;
      reason: string;
    }
  ) {}
}

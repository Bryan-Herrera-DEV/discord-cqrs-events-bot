import type { Command } from "@shared/application/CommandBus";

export interface KickMemberResult {
  caseNumber: number;
}

export class KickMemberCommand implements Command<KickMemberResult> {
  public static readonly type = "moderation.kick";
  public readonly type = KickMemberCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      targetUserId: string;
      reason: string;
    }
  ) {}
}

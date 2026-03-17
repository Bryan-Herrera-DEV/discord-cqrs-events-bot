import type { Command } from "@shared/application/CommandBus";

export interface BanMemberResult {
  caseNumber: number;
}

export class BanMemberCommand implements Command<BanMemberResult> {
  public static readonly type = "moderation.ban";
  public readonly type = BanMemberCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      targetUserId: string;
      reason: string;
      softBan?: boolean;
    }
  ) {}
}

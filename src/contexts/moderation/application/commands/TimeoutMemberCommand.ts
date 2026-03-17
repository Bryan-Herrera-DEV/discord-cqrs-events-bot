import type { Command } from "@shared/application/CommandBus";

export interface TimeoutMemberResult {
  caseNumber: number;
}

export class TimeoutMemberCommand implements Command<TimeoutMemberResult> {
  public static readonly type = "moderation.timeout";
  public readonly type = TimeoutMemberCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      targetUserId: string;
      durationMs: number;
      reason: string;
    }
  ) {}
}

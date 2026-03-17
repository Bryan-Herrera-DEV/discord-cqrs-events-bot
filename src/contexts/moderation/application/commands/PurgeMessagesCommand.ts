import type { Command } from "@shared/application/CommandBus";

export interface PurgeMessagesResult {
  caseNumber: number;
  deleted: number;
}

export class PurgeMessagesCommand implements Command<PurgeMessagesResult> {
  public static readonly type = "moderation.purge";
  public readonly type = PurgeMessagesCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      moderatorUserId: string;
      channelId: string;
      amount: number;
      reason: string;
    }
  ) {}
}

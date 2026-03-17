import type { CommandHandler } from "@shared/application/CommandBus";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import {
  PurgeMessagesCommand,
  type PurgeMessagesResult
} from "@contexts/moderation/application/commands/PurgeMessagesCommand";

export class PurgeMessagesHandler
  implements CommandHandler<PurgeMessagesCommand, PurgeMessagesResult>
{
  public constructor(
    private readonly moderationGateway: ModerationExecutionPort,
    private readonly caseRecorder: ModerationCaseRecorder
  ) {}

  public async handle(command: PurgeMessagesCommand): Promise<PurgeMessagesResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();
    const deleted = await this.moderationGateway.purge(
      command.payload.guildId,
      command.payload.channelId,
      command.payload.amount,
      reason
    );

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: "purge",
      moderatorUserId: command.payload.moderatorUserId,
      reason,
      metadata: {
        channelId: command.payload.channelId,
        amount: command.payload.amount,
        deleted
      }
    });
    return { caseNumber, deleted };
  }
}

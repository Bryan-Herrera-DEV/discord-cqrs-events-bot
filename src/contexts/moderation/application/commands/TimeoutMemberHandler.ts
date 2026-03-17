import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import {
  TimeoutMemberCommand,
  type TimeoutMemberResult
} from "@contexts/moderation/application/commands/TimeoutMemberCommand";

export class TimeoutMemberHandler
  implements CommandHandler<TimeoutMemberCommand, TimeoutMemberResult>
{
  public constructor(
    private readonly moderationGateway: ModerationExecutionPort,
    private readonly caseRecorder: ModerationCaseRecorder,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: TimeoutMemberCommand): Promise<TimeoutMemberResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();
    await this.moderationGateway.timeout(
      command.payload.guildId,
      command.payload.targetUserId,
      command.payload.durationMs,
      reason
    );

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: "timeout",
      moderatorUserId: command.payload.moderatorUserId,
      targetUserId: command.payload.targetUserId,
      durationMs: command.payload.durationMs,
      reason
    });

    await this.eventBus.publish(
      BotEvents.memberTimedOut({
        guildId: command.payload.guildId,
        userId: command.payload.targetUserId,
        moderatorId: command.payload.moderatorUserId,
        caseNumber,
        durationMs: command.payload.durationMs,
        reason
      })
    );

    return { caseNumber };
  }
}

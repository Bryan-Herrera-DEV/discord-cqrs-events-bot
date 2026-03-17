import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import { WarnMemberCommand, type WarnMemberResult } from "@contexts/moderation/application/commands/WarnMemberCommand";

export class WarnMemberHandler implements CommandHandler<WarnMemberCommand, WarnMemberResult> {
  public constructor(
    private readonly caseRecorder: ModerationCaseRecorder,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: WarnMemberCommand): Promise<WarnMemberResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: "warn",
      moderatorUserId: command.payload.moderatorUserId,
      targetUserId: command.payload.targetUserId,
      reason
    });

    await this.eventBus.publish(
      BotEvents.warningIssued({
        guildId: command.payload.guildId,
        userId: command.payload.targetUserId,
        moderatorId: command.payload.moderatorUserId,
        caseNumber,
        reason
      })
    );

    return { caseNumber };
  }
}

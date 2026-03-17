import type { CommandHandler } from "@shared/application/CommandBus";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import {
  UnbanMemberCommand,
  type UnbanMemberResult
} from "@contexts/moderation/application/commands/UnbanMemberCommand";

export class UnbanMemberHandler implements CommandHandler<UnbanMemberCommand, UnbanMemberResult> {
  public constructor(
    private readonly moderationGateway: ModerationExecutionPort,
    private readonly caseRecorder: ModerationCaseRecorder
  ) {}

  public async handle(command: UnbanMemberCommand): Promise<UnbanMemberResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();
    await this.moderationGateway.unban(command.payload.guildId, command.payload.targetUserId, reason);

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: "unban",
      moderatorUserId: command.payload.moderatorUserId,
      targetUserId: command.payload.targetUserId,
      reason
    });
    return { caseNumber };
  }
}

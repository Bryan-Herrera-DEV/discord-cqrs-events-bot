import type { CommandHandler } from "@shared/application/CommandBus";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import { KickMemberCommand, type KickMemberResult } from "@contexts/moderation/application/commands/KickMemberCommand";

export class KickMemberHandler implements CommandHandler<KickMemberCommand, KickMemberResult> {
  public constructor(
    private readonly moderationGateway: ModerationExecutionPort,
    private readonly caseRecorder: ModerationCaseRecorder
  ) {}

  public async handle(command: KickMemberCommand): Promise<KickMemberResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();
    await this.moderationGateway.kick(command.payload.guildId, command.payload.targetUserId, reason);

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: "kick",
      moderatorUserId: command.payload.moderatorUserId,
      targetUserId: command.payload.targetUserId,
      reason
    });
    return { caseNumber };
  }
}

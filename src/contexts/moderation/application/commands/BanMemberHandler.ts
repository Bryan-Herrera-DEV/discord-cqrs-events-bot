import type { CommandHandler } from "@shared/application/CommandBus";
import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import { BanMemberCommand, type BanMemberResult } from "@contexts/moderation/application/commands/BanMemberCommand";

export class BanMemberHandler implements CommandHandler<BanMemberCommand, BanMemberResult> {
  public constructor(
    private readonly moderationGateway: ModerationExecutionPort,
    private readonly caseRecorder: ModerationCaseRecorder
  ) {}

  public async handle(command: BanMemberCommand): Promise<BanMemberResult> {
    const reason = ModerationReason.create(command.payload.reason).toString();
    if (command.payload.softBan) {
      await this.moderationGateway.ban(command.payload.guildId, command.payload.targetUserId, reason);
      await this.moderationGateway.unban(command.payload.guildId, command.payload.targetUserId, "Softban cleanup");
    } else {
      await this.moderationGateway.ban(command.payload.guildId, command.payload.targetUserId, reason);
    }

    const caseNumber = await this.caseRecorder.record({
      guildId: command.payload.guildId,
      actionType: command.payload.softBan ? "softban" : "ban",
      moderatorUserId: command.payload.moderatorUserId,
      targetUserId: command.payload.targetUserId,
      reason,
      metadata: {
        softBan: command.payload.softBan ?? false
      }
    });
    return { caseNumber };
  }
}

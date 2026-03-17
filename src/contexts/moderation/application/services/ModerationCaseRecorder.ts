import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { ModerationActionRepository } from "@contexts/moderation/application/ports/ModerationActionRepository";
import type { ModerationCaseRepository } from "@contexts/moderation/application/ports/ModerationCaseRepository";
import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import type { ModerationActionType } from "@contexts/moderation/domain/ModerationCase";

export interface RecordModerationCaseInput {
  guildId: string;
  actionType: ModerationActionType;
  moderatorUserId: string;
  targetUserId?: string;
  reason: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export class ModerationCaseRecorder {
  public constructor(
    private readonly caseRepository: ModerationCaseRepository,
    private readonly actionRepository: ModerationActionRepository,
    private readonly guildSettingsRepository: GuildSettingsRepository,
    private readonly moderationGateway: ModerationExecutionPort
  ) {}

  public async record(input: RecordModerationCaseInput): Promise<number> {
    const settings =
      (await this.guildSettingsRepository.findByGuildId(input.guildId)) ??
      defaultGuildSettings(input.guildId);

    if (!settings.featureFlags.moderationEnabled) {
      throw new Error("La moderación está deshabilitada para esta guild");
    }

    const caseNumber = await this.guildSettingsRepository.nextModerationCaseNumber(input.guildId);
    const now = new Date();

    await this.caseRepository.create({
      guildId: input.guildId,
      caseNumber,
      actionType: input.actionType,
      targetUserId: input.targetUserId,
      moderatorUserId: input.moderatorUserId,
      reason: input.reason,
      durationMs: input.durationMs,
      metadata: input.metadata,
      status: "executed",
      createdAt: now,
      updatedAt: now
    });

    await this.actionRepository.append({
      guildId: input.guildId,
      caseNumber,
      actionType: input.actionType,
      actorUserId: input.moderatorUserId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      metadata: input.metadata,
      createdAt: now
    });

    await this.moderationGateway.logToModerationChannel({
      guildId: input.guildId,
      actionType: input.actionType,
      caseNumber,
      moderatorUserId: input.moderatorUserId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      metadata: input.metadata
    });

    return caseNumber;
  }
}

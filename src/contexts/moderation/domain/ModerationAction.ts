import type { ModerationActionType } from "@contexts/moderation/domain/ModerationCase";

export interface ModerationAction {
  guildId: string;
  caseNumber: number;
  actionType: ModerationActionType;
  actorUserId: string;
  targetUserId?: string;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

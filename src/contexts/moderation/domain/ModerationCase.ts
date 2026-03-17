export type ModerationActionType =
  | "warn"
  | "kick"
  | "ban"
  | "unban"
  | "timeout"
  | "purge"
  | "softban";

export interface ModerationCase {
  guildId: string;
  caseNumber: number;
  actionType: ModerationActionType;
  targetUserId?: string;
  moderatorUserId: string;
  reason: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  status: "executed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

import type { ModerationActionType } from "@contexts/moderation/domain/ModerationCase";

export interface ModerationExecutionPort {
  kick(guildId: string, targetUserId: string, reason: string): Promise<void>;
  ban(guildId: string, targetUserId: string, reason: string): Promise<void>;
  unban(guildId: string, targetUserId: string, reason: string): Promise<void>;
  timeout(guildId: string, targetUserId: string, durationMs: number, reason: string): Promise<void>;
  purge(guildId: string, channelId: string, amount: number, reason: string): Promise<number>;
  logToModerationChannel(input: {
    guildId: string;
    actionType: ModerationActionType;
    caseNumber: number;
    moderatorUserId: string;
    targetUserId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

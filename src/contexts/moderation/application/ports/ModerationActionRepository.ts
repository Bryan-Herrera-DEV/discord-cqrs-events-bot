import type { ModerationAction } from "@contexts/moderation/domain/ModerationAction";

export interface ModerationActionRepository {
  init(): Promise<void>;
  append(action: ModerationAction): Promise<void>;
  findByGuildAndCaseNumber(guildId: string, caseNumber: number): Promise<ModerationAction[]>;
}

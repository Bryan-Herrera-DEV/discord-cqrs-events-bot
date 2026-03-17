import type { ModerationCase } from "@contexts/moderation/domain/ModerationCase";

export interface ModerationCaseRepository {
  init(): Promise<void>;
  create(caseRecord: ModerationCase): Promise<void>;
  findByGuildAndCaseNumber(guildId: string, caseNumber: number): Promise<ModerationCase | null>;
}

import type { MemberProfile } from "@contexts/members/domain/MemberProfile";

export interface MemberProfileRepository {
  init(): Promise<void>;
  save(profile: MemberProfile): Promise<void>;
  findByGuildAndUser(guildId: string, userId: string): Promise<MemberProfile | null>;
  markLeft(guildId: string, userId: string, leftAt: Date): Promise<void>;
}

import type { LevelProfile } from "@contexts/levels/domain/LevelProfile";

export interface LeaderboardEntry {
  userId: string;
  xp: number;
  level: number;
  totalMessages: number;
}

export interface LevelProfileRepository {
  init(): Promise<void>;
  createIfMissing(guildId: string, userId: string): Promise<void>;
  findByGuildAndUser(guildId: string, userId: string): Promise<LevelProfile | null>;
  save(profile: LevelProfile): Promise<void>;
  topByGuild(guildId: string, limit: number): Promise<LeaderboardEntry[]>;
  rankByGuild(guildId: string, userId: string): Promise<number | null>;
}

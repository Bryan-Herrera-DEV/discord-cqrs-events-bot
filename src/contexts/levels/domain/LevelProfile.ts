export interface LevelProfile {
  guildId: string;
  userId: string;
  level: number;
  xp: number;
  totalMessages: number;
  lastXpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const createInitialLevelProfile = (guildId: string, userId: string): LevelProfile => {
  const now = new Date();
  return {
    guildId,
    userId,
    level: 1,
    xp: 0,
    totalMessages: 0,
    createdAt: now,
    updatedAt: now
  };
};

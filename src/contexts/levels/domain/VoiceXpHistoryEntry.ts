export type VoiceXpHistoryOutcome = "granted" | "skipped-leveling-disabled" | "skipped-no-xp";

export interface VoiceXpHistoryEntry {
  guildId: string;
  channelId: string;
  userId: string;
  sessionStartedAt: Date;
  sessionEndedAt: Date;
  participationMs: number;
  requestedMinutes: number;
  effectiveMinutes: number;
  xpPerMinute: number;
  maxMinutesPerSession: number;
  calculatedXp: number;
  grantedXp: number;
  profileCreated: boolean;
  previousXp: number;
  newXp: number;
  previousLevel: number;
  newLevel: number;
  outcome: VoiceXpHistoryOutcome;
  createdAt: Date;
}

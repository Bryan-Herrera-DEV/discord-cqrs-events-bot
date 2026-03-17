import type { Command } from "@shared/application/CommandBus";

export interface GrantVoiceXpPayload {
  guildId: string;
  channelId: string;
  userId: string;
  sessionStartedAt: Date;
  sessionEndedAt: Date;
  participationMs: number;
  xpPerMinute: number;
  maxMinutesPerSession: number;
}

export class GrantVoiceXpCommand implements Command<void> {
  public static readonly type = "levels.grant-voice-xp";
  public readonly type = GrantVoiceXpCommand.type;

  public constructor(public readonly payload: GrantVoiceXpPayload) {}
}

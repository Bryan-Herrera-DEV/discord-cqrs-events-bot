import { createEventId, type DomainEvent } from "@shared/domain/DomainEvent";

export interface GuildMemberJoinedPayload {
  guildId: string;
  userId: string;
  username: string;
  globalName?: string;
  displayName: string;
  avatarUrl?: string;
  isBot: boolean;
  joinedAt: Date;
  initialRoleIds: string[];
}

export interface GuildMemberLeftPayload {
  guildId: string;
  userId: string;
  username: string;
  globalName?: string;
  displayName: string;
  avatarUrl?: string;
  leftAt: Date;
}

export interface UserRegisteredPayload {
  guildId: string;
  userId: string;
  registeredAt: Date;
}

export interface MemberLeveledUpPayload {
  guildId: string;
  userId: string;
  previousLevel: number;
  newLevel: number;
  xp: number;
}

export interface WelcomeMessageRequestedPayload {
  guildId: string;
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

export interface GoodbyeMessageRequestedPayload {
  guildId: string;
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
}

export interface GuildConfigurationChangedPayload {
  guildId: string;
  changedBy: string;
  changedFields: string[];
}

export interface WarningIssuedPayload {
  guildId: string;
  userId: string;
  moderatorId: string;
  caseNumber: number;
  reason: string;
}

export interface MemberTimedOutPayload {
  guildId: string;
  userId: string;
  moderatorId: string;
  caseNumber: number;
  durationMs: number;
  reason: string;
}

const makeEvent = <TPayload>(
  name: string,
  payload: TPayload,
  metadata?: Record<string, string>
): DomainEvent<TPayload> => ({
  id: createEventId(),
  name,
  payload,
  occurredAt: new Date(),
  metadata
});

export const BotEvents = {
  guildMemberJoined: (payload: GuildMemberJoinedPayload): DomainEvent<GuildMemberJoinedPayload> =>
    makeEvent("GuildMemberJoined", payload),
  guildMemberLeft: (payload: GuildMemberLeftPayload): DomainEvent<GuildMemberLeftPayload> =>
    makeEvent("GuildMemberLeft", payload),
  userRegistered: (payload: UserRegisteredPayload): DomainEvent<UserRegisteredPayload> =>
    makeEvent("UserRegistered", payload),
  memberLeveledUp: (payload: MemberLeveledUpPayload): DomainEvent<MemberLeveledUpPayload> =>
    makeEvent("MemberLeveledUp", payload),
  welcomeMessageRequested: (
    payload: WelcomeMessageRequestedPayload
  ): DomainEvent<WelcomeMessageRequestedPayload> => makeEvent("WelcomeMessageRequested", payload),
  goodbyeMessageRequested: (
    payload: GoodbyeMessageRequestedPayload
  ): DomainEvent<GoodbyeMessageRequestedPayload> => makeEvent("GoodbyeMessageRequested", payload),
  guildConfigurationChanged: (
    payload: GuildConfigurationChangedPayload
  ): DomainEvent<GuildConfigurationChangedPayload> =>
    makeEvent("GuildConfigurationChanged", payload),
  warningIssued: (payload: WarningIssuedPayload): DomainEvent<WarningIssuedPayload> =>
    makeEvent("WarningIssued", payload),
  memberTimedOut: (payload: MemberTimedOutPayload): DomainEvent<MemberTimedOutPayload> =>
    makeEvent("MemberTimedOut", payload)
};

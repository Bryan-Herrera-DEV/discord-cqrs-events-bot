import type { Command } from "@shared/application/CommandBus";

export interface RegisterMemberOnJoinPayload {
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

export class RegisterMemberOnJoinCommand implements Command<void> {
  public static readonly type = "members.register-on-join";
  public readonly type = RegisterMemberOnJoinCommand.type;

  public constructor(public readonly payload: RegisterMemberOnJoinPayload) {}
}

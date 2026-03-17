import type { Command } from "@shared/application/CommandBus";

export interface SetupWelcomePayload {
  guildId: string;
  changedBy: string;
  enabled?: boolean;
  channelId?: string;
  template?: string;
  useImage?: boolean;
}

export class SetupWelcomeCommand implements Command<void> {
  public static readonly type = "welcome.setup";
  public readonly type = SetupWelcomeCommand.type;

  public constructor(public readonly payload: SetupWelcomePayload) {}
}

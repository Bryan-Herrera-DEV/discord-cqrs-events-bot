import type { Command } from "@shared/application/CommandBus";

import type { GuildChannels, PermissionPolicies } from "@contexts/guild-settings/domain/GuildSettings";

export interface UpsertGuildSettingsPayload {
  guildId: string;
  changedBy: string;
  language?: string;
  channels?: GuildChannels;
  featureFlags?: {
    moderationEnabled?: boolean;
    levelingEnabled?: boolean;
    welcomeEnabled?: boolean;
    goodbyeEnabled?: boolean;
    rolesEnabled?: boolean;
  };
  permissionPolicies?: Partial<PermissionPolicies>;
}

export class UpsertGuildSettingsCommand implements Command<void> {
  public static readonly type = "guild-settings.upsert";
  public readonly type = UpsertGuildSettingsCommand.type;

  public constructor(public readonly payload: UpsertGuildSettingsPayload) {}
}

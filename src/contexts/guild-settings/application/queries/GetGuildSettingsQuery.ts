import type { Query } from "@shared/application/QueryBus";

import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export class GetGuildSettingsQuery implements Query<GuildSettings> {
  public static readonly type = "guild-settings.get";
  public readonly type = GetGuildSettingsQuery.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

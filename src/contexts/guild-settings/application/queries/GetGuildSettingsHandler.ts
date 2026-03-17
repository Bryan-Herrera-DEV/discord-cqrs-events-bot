import type { QueryHandler } from "@shared/application/QueryBus";

import {
  defaultGuildSettings,
  type GuildSettings
} from "@contexts/guild-settings/domain/GuildSettings";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";

export class GetGuildSettingsHandler implements QueryHandler<GetGuildSettingsQuery, GuildSettings> {
  public constructor(private readonly repository: GuildSettingsRepository) {}

  public async handle(query: GetGuildSettingsQuery): Promise<GuildSettings> {
    return (await this.repository.findByGuildId(query.payload.guildId)) ??
      defaultGuildSettings(query.payload.guildId);
  }
}

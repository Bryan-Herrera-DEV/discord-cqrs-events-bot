import type { Guild } from "@contexts/guilds/domain/Guild";

export interface GuildRepository {
  init(): Promise<void>;
  upsert(guild: Guild): Promise<void>;
  markInactive(guildId: string, leftAt: Date): Promise<void>;
  findByGuildId(guildId: string): Promise<Guild | null>;
}

import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export interface GuildSettingsRepository {
  init(): Promise<void>;
  findByGuildId(guildId: string): Promise<GuildSettings | null>;
  upsert(settings: GuildSettings): Promise<void>;
  patch(
    guildId: string,
    patch: Partial<Omit<GuildSettings, "guildId" | "createdAt" | "updatedAt">>
  ): Promise<GuildSettings>;
  nextModerationCaseNumber(guildId: string): Promise<number>;
}

import type { GoodbyeConfiguration } from "@contexts/goodbye/domain/GoodbyeConfiguration";

export interface GoodbyeConfigurationRepository {
  init(): Promise<void>;
  findByGuildId(guildId: string): Promise<GoodbyeConfiguration | null>;
  upsert(configuration: GoodbyeConfiguration): Promise<void>;
}

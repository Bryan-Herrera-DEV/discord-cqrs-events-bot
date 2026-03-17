import type { WelcomeConfiguration } from "@contexts/welcome/domain/WelcomeConfiguration";

export interface WelcomeConfigurationRepository {
  init(): Promise<void>;
  findByGuildId(guildId: string): Promise<WelcomeConfiguration | null>;
  upsert(configuration: WelcomeConfiguration): Promise<void>;
}

import type { QueryHandler } from "@shared/application/QueryBus";

import {
  defaultWelcomeConfiguration,
  type WelcomeConfiguration
} from "@contexts/welcome/domain/WelcomeConfiguration";
import type { WelcomeConfigurationRepository } from "@contexts/welcome/application/ports/WelcomeConfigurationRepository";
import { GetWelcomeConfigurationQuery } from "@contexts/welcome/application/queries/GetWelcomeConfigurationQuery";

export class GetWelcomeConfigurationHandler
  implements QueryHandler<GetWelcomeConfigurationQuery, WelcomeConfiguration>
{
  public constructor(private readonly repository: WelcomeConfigurationRepository) {}

  public async handle(query: GetWelcomeConfigurationQuery): Promise<WelcomeConfiguration> {
    return (await this.repository.findByGuildId(query.payload.guildId)) ??
      defaultWelcomeConfiguration(query.payload.guildId);
  }
}

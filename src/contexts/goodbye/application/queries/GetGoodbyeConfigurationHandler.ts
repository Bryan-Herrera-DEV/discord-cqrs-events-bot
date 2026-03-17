import type { QueryHandler } from "@shared/application/QueryBus";

import {
  defaultGoodbyeConfiguration,
  type GoodbyeConfiguration
} from "@contexts/goodbye/domain/GoodbyeConfiguration";
import type { GoodbyeConfigurationRepository } from "@contexts/goodbye/application/ports/GoodbyeConfigurationRepository";
import { GetGoodbyeConfigurationQuery } from "@contexts/goodbye/application/queries/GetGoodbyeConfigurationQuery";

export class GetGoodbyeConfigurationHandler
  implements QueryHandler<GetGoodbyeConfigurationQuery, GoodbyeConfiguration>
{
  public constructor(private readonly repository: GoodbyeConfigurationRepository) {}

  public async handle(query: GetGoodbyeConfigurationQuery): Promise<GoodbyeConfiguration> {
    return (await this.repository.findByGuildId(query.payload.guildId)) ??
      defaultGoodbyeConfiguration(query.payload.guildId);
  }
}

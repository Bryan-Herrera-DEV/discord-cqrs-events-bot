import type { Query } from "@shared/application/QueryBus";

import type { GoodbyeConfiguration } from "@contexts/goodbye/domain/GoodbyeConfiguration";

export class GetGoodbyeConfigurationQuery implements Query<GoodbyeConfiguration> {
  public static readonly type = "goodbye.get-configuration";
  public readonly type = GetGoodbyeConfigurationQuery.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

import type { Query } from "@shared/application/QueryBus";

import type { WelcomeConfiguration } from "@contexts/welcome/domain/WelcomeConfiguration";

export class GetWelcomeConfigurationQuery implements Query<WelcomeConfiguration> {
  public static readonly type = "welcome.get-configuration";
  public readonly type = GetWelcomeConfigurationQuery.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

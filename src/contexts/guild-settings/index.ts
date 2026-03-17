import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { UpsertGuildSettingsCommand } from "@contexts/guild-settings/application/commands/UpsertGuildSettingsCommand";
import { UpsertGuildSettingsHandler } from "@contexts/guild-settings/application/commands/UpsertGuildSettingsHandler";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import { GetGuildSettingsHandler } from "@contexts/guild-settings/application/queries/GetGuildSettingsHandler";
import { MongoGuildSettingsRepository } from "@contexts/guild-settings/infrastructure/persistence/MongoGuildSettingsRepository";

export class GuildSettingsModule implements BotModule {
  public readonly name = "guild-settings";

  public async register(context: AppContext): Promise<void> {
    const repository = new MongoGuildSettingsRepository(context.mongo.getDatabase());
    await repository.init();

    context.commandBus.register(
      UpsertGuildSettingsCommand.type,
      new UpsertGuildSettingsHandler(repository, context.eventBus)
    );
    context.queryBus.register(GetGuildSettingsQuery.type, new GetGuildSettingsHandler(repository));

    (context as unknown as { guildSettingsRepository: MongoGuildSettingsRepository }).guildSettingsRepository =
      repository;
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    void registry;
  }
}

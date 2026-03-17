import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { RegisterGuildCommand } from "@contexts/guilds/application/commands/RegisterGuildCommand";
import { RegisterGuildHandler } from "@contexts/guilds/application/commands/RegisterGuildHandler";
import { MarkGuildRemovedCommand } from "@contexts/guilds/application/commands/MarkGuildRemovedCommand";
import { MarkGuildRemovedHandler } from "@contexts/guilds/application/commands/MarkGuildRemovedHandler";
import { MongoGuildRepository } from "@contexts/guilds/infrastructure/persistence/MongoGuildRepository";

export class GuildsModule implements BotModule {
  public readonly name = "guilds";

  public async register(context: AppContext): Promise<void> {
    const repository = new MongoGuildRepository(context.mongo.getDatabase());
    await repository.init();

    context.commandBus.register(RegisterGuildCommand.type, new RegisterGuildHandler(repository));
    context.commandBus.register(MarkGuildRemovedCommand.type, new MarkGuildRemovedHandler(repository));

    (context as unknown as { guildRepository: MongoGuildRepository }).guildRepository = repository;
  }

  public registerSlashCommands(_registry: SlashCommandRegistry): void {}
}

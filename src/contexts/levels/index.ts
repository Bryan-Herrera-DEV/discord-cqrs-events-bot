import { SlashCommandBuilder } from "discord.js";

import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { InitializeLevelProfileCommand } from "@contexts/levels/application/commands/InitializeLevelProfileCommand";
import { InitializeLevelProfileHandler } from "@contexts/levels/application/commands/InitializeLevelProfileHandler";
import { GrantMessageXpCommand } from "@contexts/levels/application/commands/GrantMessageXpCommand";
import { GrantMessageXpHandler } from "@contexts/levels/application/commands/GrantMessageXpHandler";
import { GrantVoiceXpCommand } from "@contexts/levels/application/commands/GrantVoiceXpCommand";
import { GrantVoiceXpHandler } from "@contexts/levels/application/commands/GrantVoiceXpHandler";
import { GetMyLevelQuery } from "@contexts/levels/application/queries/GetMyLevelQuery";
import { GetMyLevelHandler } from "@contexts/levels/application/queries/GetMyLevelHandler";
import { GetLevelLeaderboardQuery } from "@contexts/levels/application/queries/GetLevelLeaderboardQuery";
import { GetLevelLeaderboardHandler } from "@contexts/levels/application/queries/GetLevelLeaderboardHandler";
import { MongoLevelProfileRepository } from "@contexts/levels/infrastructure/persistence/MongoLevelProfileRepository";
import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { OnUserRegisteredInitializeLevelHandler } from "@contexts/levels/application/events/OnUserRegisteredInitializeLevelHandler";

export class LevelsModule implements BotModule {
  public readonly name = "levels";

  public async register(context: AppContext): Promise<void> {
    const repository = new MongoLevelProfileRepository(context.mongo.getDatabase());
    await repository.init();

    const levelPolicy = new LevelPolicy();
    const guildSettingsRepository = (
      context as unknown as {
        guildSettingsRepository: import("@contexts/guild-settings/infrastructure/persistence/MongoGuildSettingsRepository").MongoGuildSettingsRepository;
      }
    ).guildSettingsRepository;

    context.commandBus.register(
      InitializeLevelProfileCommand.type,
      new InitializeLevelProfileHandler(repository)
    );
    context.commandBus.register(
      GrantMessageXpCommand.type,
      new GrantMessageXpHandler(repository, levelPolicy, context.eventBus, guildSettingsRepository)
    );
    context.commandBus.register(
      GrantVoiceXpCommand.type,
      new GrantVoiceXpHandler(repository, levelPolicy, context.eventBus, guildSettingsRepository)
    );
    context.queryBus.register(GetMyLevelQuery.type, new GetMyLevelHandler(repository, levelPolicy));
    context.queryBus.register(
      GetLevelLeaderboardQuery.type,
      new GetLevelLeaderboardHandler(repository)
    );

    context.eventBus.subscribe(
      "UserRegistered",
      new OnUserRegisteredInitializeLevelHandler(context.commandBus).build()
    );

    (
      context as unknown as { levelProfileRepository: MongoLevelProfileRepository }
    ).levelProfileRepository = repository;
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    registry.add(
      new SlashCommandBuilder()
        .setName("level")
        .setDescription("Comandos de niveles y XP")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("me")
            .setDescription("Muestra tu nivel actual")
            .addUserOption((option) =>
              option.setName("user").setDescription("Usuario para consultar").setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("leaderboard")
            .setDescription("Muestra leaderboard de niveles")
            .addIntegerOption((option) =>
              option
                .setName("limit")
                .setDescription("Cantidad de usuarios a listar (1-20)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)
            )
        )
    );
  }
}

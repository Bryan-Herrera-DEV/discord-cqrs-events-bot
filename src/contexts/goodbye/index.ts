import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { NapiCanvasWelcomeImageGenerator } from "@contexts/welcome/infrastructure/image/NapiCanvasWelcomeImageGenerator";
import { OnGuildMemberLeftRequestGoodbyeHandler } from "@contexts/goodbye/application/events/OnGuildMemberLeftRequestGoodbyeHandler";
import { OnGoodbyeMessageRequestedHandler } from "@contexts/goodbye/application/events/OnGoodbyeMessageRequestedHandler";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";

export class GoodbyeModule implements BotModule {
  public readonly name = "goodbye";

  public async register(context: AppContext): Promise<void> {
    const imageGenerator = new NapiCanvasWelcomeImageGenerator();
    const guildSettingsRepository = (
      context as unknown as {
        guildSettingsRepository: GuildSettingsRepository;
      }
    ).guildSettingsRepository;

    context.eventBus.subscribe(
      "GuildMemberLeft",
      new OnGuildMemberLeftRequestGoodbyeHandler(context.eventBus).build()
    );
    context.eventBus.subscribe(
      "GoodbyeMessageRequested",
      new OnGoodbyeMessageRequestedHandler(
        imageGenerator,
        guildSettingsRepository,
        context.discord,
        context.logger.child({ module: "goodbye" })
      ).build()
    );
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    void registry;
  }
}

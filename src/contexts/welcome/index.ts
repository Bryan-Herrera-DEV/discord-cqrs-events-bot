import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { NapiCanvasWelcomeImageGenerator } from "@contexts/welcome/infrastructure/image/NapiCanvasWelcomeImageGenerator";
import { OnGuildMemberJoinedRequestWelcomeHandler } from "@contexts/welcome/application/events/OnGuildMemberJoinedRequestWelcomeHandler";
import { OnWelcomeMessageRequestedHandler } from "@contexts/welcome/application/events/OnWelcomeMessageRequestedHandler";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";

export class WelcomeModule implements BotModule {
  public readonly name = "welcome";

  public async register(context: AppContext): Promise<void> {
    const imageGenerator = new NapiCanvasWelcomeImageGenerator();
    const guildSettingsRepository = (
      context as unknown as {
        guildSettingsRepository: GuildSettingsRepository;
      }
    ).guildSettingsRepository;

    context.eventBus.subscribe(
      "GuildMemberJoined",
      new OnGuildMemberJoinedRequestWelcomeHandler(context.eventBus).build()
    );
    context.eventBus.subscribe(
      "WelcomeMessageRequested",
      new OnWelcomeMessageRequestedHandler(
        imageGenerator,
        guildSettingsRepository,
        context.discord,
        context.logger.child({ module: "welcome" })
      ).build()
    );
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    void registry;
  }
}

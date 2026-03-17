import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { NapiCanvasWelcomeImageGenerator } from "@contexts/welcome/infrastructure/image/NapiCanvasWelcomeImageGenerator";
import { OnGuildMemberJoinedRequestWelcomeHandler } from "@contexts/welcome/application/events/OnGuildMemberJoinedRequestWelcomeHandler";
import { OnWelcomeMessageRequestedHandler } from "@contexts/welcome/application/events/OnWelcomeMessageRequestedHandler";

export class WelcomeModule implements BotModule {
  public readonly name = "welcome";

  public async register(context: AppContext): Promise<void> {
    const imageGenerator = new NapiCanvasWelcomeImageGenerator();

    context.eventBus.subscribe(
      "GuildMemberJoined",
      new OnGuildMemberJoinedRequestWelcomeHandler(context.eventBus).build()
    );
    context.eventBus.subscribe(
      "WelcomeMessageRequested",
      new OnWelcomeMessageRequestedHandler(
        imageGenerator,
        context.discord,
        context.logger.child({ module: "welcome" })
      ).build()
    );
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    void registry;
  }
}

import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import { SetupGoodbyeCommand } from "@contexts/goodbye/application/commands/SetupGoodbyeCommand";
import { SetupGoodbyeHandler } from "@contexts/goodbye/application/commands/SetupGoodbyeHandler";
import { ToggleGoodbyeCommand } from "@contexts/goodbye/application/commands/ToggleGoodbyeCommand";
import type { GoodbyeConfigurationRepository } from "@contexts/goodbye/application/ports/GoodbyeConfigurationRepository";

export class ToggleGoodbyeHandler implements CommandHandler<ToggleGoodbyeCommand, void> {
  private readonly setupHandler: SetupGoodbyeHandler;

  public constructor(
    repository: GoodbyeConfigurationRepository,
    private readonly eventBus: InMemoryEventBus
  ) {
    this.setupHandler = new SetupGoodbyeHandler(repository, eventBus);
  }

  public async handle(command: ToggleGoodbyeCommand): Promise<void> {
    await this.setupHandler.handle(
      new SetupGoodbyeCommand({
        guildId: command.payload.guildId,
        changedBy: command.payload.changedBy,
        enabled: command.payload.enabled
      })
    );

    await this.eventBus.publish(
      BotEvents.guildConfigurationChanged({
        guildId: command.payload.guildId,
        changedBy: command.payload.changedBy,
        changedFields: ["goodbye.enabled"]
      })
    );
  }
}

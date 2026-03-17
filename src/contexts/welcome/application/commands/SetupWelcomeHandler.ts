import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import {
  defaultWelcomeConfiguration,
  type WelcomeConfiguration
} from "@contexts/welcome/domain/WelcomeConfiguration";
import type { WelcomeConfigurationRepository } from "@contexts/welcome/application/ports/WelcomeConfigurationRepository";
import { SetupWelcomeCommand } from "@contexts/welcome/application/commands/SetupWelcomeCommand";

export class SetupWelcomeHandler implements CommandHandler<SetupWelcomeCommand, void> {
  public constructor(
    private readonly repository: WelcomeConfigurationRepository,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: SetupWelcomeCommand): Promise<void> {
    const existing =
      (await this.repository.findByGuildId(command.payload.guildId)) ??
      defaultWelcomeConfiguration(command.payload.guildId);

    const updated: WelcomeConfiguration = {
      ...existing,
      enabled: command.payload.enabled ?? existing.enabled,
      channelId: command.payload.channelId ?? existing.channelId,
      template: command.payload.template ?? existing.template,
      useImage: command.payload.useImage ?? existing.useImage,
      updatedAt: new Date()
    };

    await this.repository.upsert(updated);
    await this.eventBus.publish(
      BotEvents.guildConfigurationChanged({
        guildId: command.payload.guildId,
        changedBy: command.payload.changedBy,
        changedFields: ["welcome"]
      })
    );
  }
}

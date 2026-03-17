import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import {
  defaultGoodbyeConfiguration,
  type GoodbyeConfiguration
} from "@contexts/goodbye/domain/GoodbyeConfiguration";
import type { GoodbyeConfigurationRepository } from "@contexts/goodbye/application/ports/GoodbyeConfigurationRepository";
import { SetupGoodbyeCommand } from "@contexts/goodbye/application/commands/SetupGoodbyeCommand";

export class SetupGoodbyeHandler implements CommandHandler<SetupGoodbyeCommand, void> {
  public constructor(
    private readonly repository: GoodbyeConfigurationRepository,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: SetupGoodbyeCommand): Promise<void> {
    const existing =
      (await this.repository.findByGuildId(command.payload.guildId)) ??
      defaultGoodbyeConfiguration(command.payload.guildId);

    const updated: GoodbyeConfiguration = {
      ...existing,
      enabled: command.payload.enabled ?? existing.enabled,
      channelId: command.payload.channelId ?? existing.channelId,
      template: command.payload.template ?? existing.template,
      updatedAt: new Date()
    };

    await this.repository.upsert(updated);
    await this.eventBus.publish(
      BotEvents.guildConfigurationChanged({
        guildId: command.payload.guildId,
        changedBy: command.payload.changedBy,
        changedFields: ["goodbye"]
      })
    );
  }
}

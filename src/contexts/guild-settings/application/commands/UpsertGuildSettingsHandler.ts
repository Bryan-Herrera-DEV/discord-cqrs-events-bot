import { BotEvents } from "@shared/domain/events/BotEvents";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import type { CommandHandler } from "@shared/application/CommandBus";

import { defaultGuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import { UpsertGuildSettingsCommand } from "@contexts/guild-settings/application/commands/UpsertGuildSettingsCommand";

export class UpsertGuildSettingsHandler
  implements CommandHandler<UpsertGuildSettingsCommand, void>
{
  public constructor(
    private readonly repository: GuildSettingsRepository,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: UpsertGuildSettingsCommand): Promise<void> {
    const existing =
      (await this.repository.findByGuildId(command.payload.guildId)) ??
      defaultGuildSettings(command.payload.guildId);

    const merged = {
      ...existing,
      language: command.payload.language ?? existing.language,
      channels: {
        ...existing.channels,
        ...(command.payload.channels ?? {})
      },
      featureFlags: {
        ...existing.featureFlags,
        ...(command.payload.featureFlags ?? {})
      },
      permissionPolicies: {
        ...existing.permissionPolicies,
        ...(command.payload.permissionPolicies ?? {})
      },
      updatedAt: new Date()
    };

    await this.repository.upsert(merged);
    await this.eventBus.publish(
      BotEvents.guildConfigurationChanged({
        guildId: command.payload.guildId,
        changedBy: command.payload.changedBy,
        changedFields: [
          ...(command.payload.language ? ["language"] : []),
          ...(command.payload.channels ? ["channels"] : []),
          ...(command.payload.featureFlags ? ["featureFlags"] : []),
          ...(command.payload.permissionPolicies ? ["permissionPolicies"] : [])
        ]
      })
    );
  }
}

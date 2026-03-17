import type { CommandHandler } from "@shared/application/CommandBus";

import type { GuildRepository } from "@contexts/guilds/application/ports/GuildRepository";
import { MarkGuildRemovedCommand } from "@contexts/guilds/application/commands/MarkGuildRemovedCommand";

export class MarkGuildRemovedHandler
  implements CommandHandler<MarkGuildRemovedCommand, void>
{
  public constructor(private readonly repository: GuildRepository) {}

  public async handle(command: MarkGuildRemovedCommand): Promise<void> {
    await this.repository.markInactive(command.payload.guildId, new Date());
  }
}

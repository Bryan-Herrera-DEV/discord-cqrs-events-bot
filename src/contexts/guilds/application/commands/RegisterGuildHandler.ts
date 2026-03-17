import type { CommandHandler } from "@shared/application/CommandBus";

import type { GuildRepository } from "@contexts/guilds/application/ports/GuildRepository";
import { RegisterGuildCommand } from "@contexts/guilds/application/commands/RegisterGuildCommand";

export class RegisterGuildHandler implements CommandHandler<RegisterGuildCommand, void> {
  public constructor(private readonly repository: GuildRepository) {}

  public async handle(command: RegisterGuildCommand): Promise<void> {
    const now = new Date();
    await this.repository.upsert({
      guildId: command.payload.guildId,
      name: command.payload.name,
      ownerId: command.payload.ownerId,
      active: true,
      joinedAt: now,
      createdAt: now,
      updatedAt: now
    });
  }
}

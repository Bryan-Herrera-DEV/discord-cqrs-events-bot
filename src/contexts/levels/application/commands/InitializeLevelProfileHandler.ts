import type { CommandHandler } from "@shared/application/CommandBus";

import type { LevelProfileRepository } from "@contexts/levels/application/ports/LevelProfileRepository";
import { InitializeLevelProfileCommand } from "@contexts/levels/application/commands/InitializeLevelProfileCommand";

export class InitializeLevelProfileHandler
  implements CommandHandler<InitializeLevelProfileCommand, void>
{
  public constructor(private readonly repository: LevelProfileRepository) {}

  public async handle(command: InitializeLevelProfileCommand): Promise<void> {
    await this.repository.createIfMissing(command.payload.guildId, command.payload.userId);
  }
}

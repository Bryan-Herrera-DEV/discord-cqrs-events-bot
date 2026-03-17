import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { UserRegisteredPayload } from "@shared/domain/events/BotEvents";
import type { DomainEventHandler } from "@shared/application/EventBus";
import type { InMemoryCommandBus } from "@shared/application/CommandBus";

import { InitializeLevelProfileCommand } from "@contexts/levels/application/commands/InitializeLevelProfileCommand";

export class OnUserRegisteredInitializeLevelHandler {
  public constructor(private readonly commandBus: InMemoryCommandBus) {}

  public build(): DomainEventHandler<DomainEvent<UserRegisteredPayload>> {
    return async (event) => {
      await this.commandBus.execute(
        new InitializeLevelProfileCommand({
          guildId: event.payload.guildId,
          userId: event.payload.userId
        })
      );
    };
  }
}

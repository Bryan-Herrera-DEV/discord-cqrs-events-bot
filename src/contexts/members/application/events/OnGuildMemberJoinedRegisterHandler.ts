import type { DomainEventHandler } from "@shared/application/EventBus";
import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { GuildMemberJoinedPayload } from "@shared/domain/events/BotEvents";
import type { InMemoryCommandBus } from "@shared/application/CommandBus";

import { RegisterMemberOnJoinCommand } from "@contexts/members/application/commands/RegisterMemberOnJoinCommand";

export class OnGuildMemberJoinedRegisterHandler {
  public constructor(private readonly commandBus: InMemoryCommandBus) {}

  public build(): DomainEventHandler<DomainEvent<GuildMemberJoinedPayload>> {
    return async (event) => {
      await this.commandBus.execute(
        new RegisterMemberOnJoinCommand({
          guildId: event.payload.guildId,
          userId: event.payload.userId,
          username: event.payload.username,
          globalName: event.payload.globalName,
          displayName: event.payload.displayName,
          avatarUrl: event.payload.avatarUrl,
          isBot: event.payload.isBot,
          joinedAt: event.payload.joinedAt,
          initialRoleIds: event.payload.initialRoleIds
        })
      );
    };
  }
}

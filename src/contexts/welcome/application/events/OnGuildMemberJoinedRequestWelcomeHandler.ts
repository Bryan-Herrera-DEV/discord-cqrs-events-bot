import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { GuildMemberJoinedPayload } from "@shared/domain/events/BotEvents";
import type { DomainEventHandler, InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

export class OnGuildMemberJoinedRequestWelcomeHandler {
  public constructor(private readonly eventBus: InMemoryEventBus) {}

  public build(): DomainEventHandler<DomainEvent<GuildMemberJoinedPayload>> {
    return async (event) => {
      await this.eventBus.publish(
        BotEvents.welcomeMessageRequested({
          guildId: event.payload.guildId,
          userId: event.payload.userId,
          displayName: event.payload.displayName,
          avatarUrl: event.payload.avatarUrl
        })
      );
    };
  }
}

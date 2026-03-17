import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { GuildMemberLeftPayload } from "@shared/domain/events/BotEvents";
import type { DomainEventHandler } from "@shared/application/EventBus";

import type { MemberProfileRepository } from "@contexts/members/application/ports/MemberProfileRepository";

export class OnGuildMemberLeftHandler {
  public constructor(private readonly repository: MemberProfileRepository) {}

  public build(): DomainEventHandler<DomainEvent<GuildMemberLeftPayload>> {
    return async (event) => {
      await this.repository.markLeft(event.payload.guildId, event.payload.userId, event.payload.leftAt);
    };
  }
}

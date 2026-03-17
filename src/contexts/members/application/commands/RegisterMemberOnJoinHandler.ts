import type { CommandHandler } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import { BotEvents } from "@shared/domain/events/BotEvents";

import type { MemberProfileRepository } from "@contexts/members/application/ports/MemberProfileRepository";
import type { MemberProfile } from "@contexts/members/domain/MemberProfile";
import { RegisterMemberOnJoinCommand } from "@contexts/members/application/commands/RegisterMemberOnJoinCommand";

export class RegisterMemberOnJoinHandler
  implements CommandHandler<RegisterMemberOnJoinCommand, void>
{
  public constructor(
    private readonly repository: MemberProfileRepository,
    private readonly eventBus: InMemoryEventBus
  ) {}

  public async handle(command: RegisterMemberOnJoinCommand): Promise<void> {
    const now = new Date();
    const profile: MemberProfile = {
      guildId: command.payload.guildId,
      userId: command.payload.userId,
      username: command.payload.username,
      globalName: command.payload.globalName,
      displayName: command.payload.displayName,
      avatarUrl: command.payload.avatarUrl,
      bot: command.payload.isBot,
      initialRoleIds: command.payload.initialRoleIds,
      joinedAt: command.payload.joinedAt,
      lastSeenAt: now,
      onboarding: {
        stage: "joined"
      },
      metadata: {
        source: "discord_gateway"
      },
      createdAt: now,
      updatedAt: now
    };

    await this.repository.save(profile);
    await this.eventBus.publish(
      BotEvents.userRegistered({
        guildId: command.payload.guildId,
        userId: command.payload.userId,
        registeredAt: now
      })
    );
  }
}

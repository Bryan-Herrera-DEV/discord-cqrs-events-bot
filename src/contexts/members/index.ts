import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { RegisterMemberOnJoinCommand } from "@contexts/members/application/commands/RegisterMemberOnJoinCommand";
import { RegisterMemberOnJoinHandler } from "@contexts/members/application/commands/RegisterMemberOnJoinHandler";
import { GetMemberProfileQuery } from "@contexts/members/application/queries/GetMemberProfileQuery";
import { GetMemberProfileHandler } from "@contexts/members/application/queries/GetMemberProfileHandler";
import { MongoMemberProfileRepository } from "@contexts/members/infrastructure/persistence/MongoMemberProfileRepository";
import { OnGuildMemberJoinedRegisterHandler } from "@contexts/members/application/events/OnGuildMemberJoinedRegisterHandler";
import { OnGuildMemberLeftHandler } from "@contexts/members/application/events/OnGuildMemberLeftHandler";

export class MembersModule implements BotModule {
  public readonly name = "members";

  public async register(context: AppContext): Promise<void> {
    const repository = new MongoMemberProfileRepository(context.mongo.getDatabase());
    await repository.init();

    context.commandBus.register(
      RegisterMemberOnJoinCommand.type,
      new RegisterMemberOnJoinHandler(repository, context.eventBus)
    );
    context.queryBus.register(GetMemberProfileQuery.type, new GetMemberProfileHandler(repository));

    context.eventBus.subscribe(
      "GuildMemberJoined",
      new OnGuildMemberJoinedRegisterHandler(context.commandBus).build()
    );
    context.eventBus.subscribe("GuildMemberLeft", new OnGuildMemberLeftHandler(repository).build());

    (context as unknown as { memberProfileRepository: MongoMemberProfileRepository }).memberProfileRepository =
      repository;
  }

  public registerSlashCommands(_registry: SlashCommandRegistry): void {}
}

import { SlashCommandBuilder } from "discord.js";

import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { WarnMemberCommand } from "@contexts/moderation/application/commands/WarnMemberCommand";
import { WarnMemberHandler } from "@contexts/moderation/application/commands/WarnMemberHandler";
import { KickMemberCommand } from "@contexts/moderation/application/commands/KickMemberCommand";
import { KickMemberHandler } from "@contexts/moderation/application/commands/KickMemberHandler";
import { BanMemberCommand } from "@contexts/moderation/application/commands/BanMemberCommand";
import { BanMemberHandler } from "@contexts/moderation/application/commands/BanMemberHandler";
import { UnbanMemberCommand } from "@contexts/moderation/application/commands/UnbanMemberCommand";
import { UnbanMemberHandler } from "@contexts/moderation/application/commands/UnbanMemberHandler";
import { TimeoutMemberCommand } from "@contexts/moderation/application/commands/TimeoutMemberCommand";
import { TimeoutMemberHandler } from "@contexts/moderation/application/commands/TimeoutMemberHandler";
import { PurgeMessagesCommand } from "@contexts/moderation/application/commands/PurgeMessagesCommand";
import { PurgeMessagesHandler } from "@contexts/moderation/application/commands/PurgeMessagesHandler";
import { ViewModerationCaseQuery } from "@contexts/moderation/application/queries/ViewModerationCaseQuery";
import { ViewModerationCaseHandler } from "@contexts/moderation/application/queries/ViewModerationCaseHandler";
import { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";
import { MongoModerationCaseRepository } from "@contexts/moderation/infrastructure/persistence/MongoModerationCaseRepository";
import { MongoModerationActionRepository } from "@contexts/moderation/infrastructure/persistence/MongoModerationActionRepository";
import { DiscordModerationAdapter } from "@contexts/moderation/infrastructure/discord/DiscordModerationAdapter";

export class ModerationModule implements BotModule {
  public readonly name = "moderation";

  public async register(context: AppContext): Promise<void> {
    const caseRepository = new MongoModerationCaseRepository(context.mongo.getDatabase());
    const actionRepository = new MongoModerationActionRepository(context.mongo.getDatabase());
    await Promise.all([caseRepository.init(), actionRepository.init()]);

    const guildSettingsRepository = (
      context as unknown as {
        guildSettingsRepository: import("@contexts/guild-settings/infrastructure/persistence/MongoGuildSettingsRepository").MongoGuildSettingsRepository;
      }
    ).guildSettingsRepository;

    const moderationGateway = new DiscordModerationAdapter(context.discord, guildSettingsRepository);
    const recorder = new ModerationCaseRecorder(
      caseRepository,
      actionRepository,
      guildSettingsRepository,
      moderationGateway
    );

    context.commandBus.register(
      WarnMemberCommand.type,
      new WarnMemberHandler(recorder, context.eventBus)
    );
    context.commandBus.register(
      KickMemberCommand.type,
      new KickMemberHandler(moderationGateway, recorder)
    );
    context.commandBus.register(
      BanMemberCommand.type,
      new BanMemberHandler(moderationGateway, recorder)
    );
    context.commandBus.register(
      UnbanMemberCommand.type,
      new UnbanMemberHandler(moderationGateway, recorder)
    );
    context.commandBus.register(
      TimeoutMemberCommand.type,
      new TimeoutMemberHandler(moderationGateway, recorder, context.eventBus)
    );
    context.commandBus.register(
      PurgeMessagesCommand.type,
      new PurgeMessagesHandler(moderationGateway, recorder)
    );

    context.queryBus.register(
      ViewModerationCaseQuery.type,
      new ViewModerationCaseHandler(caseRepository, actionRepository)
    );

    (context as unknown as { moderationCaseRepository: MongoModerationCaseRepository }).moderationCaseRepository =
      caseRepository;
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    registry.add(
      new SlashCommandBuilder()
        .setName("mod")
        .setDescription("Moderación")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("warn")
            .setDescription("Emite advertencia")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addStringOption((option) =>
              option.setName("reason").setDescription("Razón obligatoria").setRequired(true).setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("kick")
            .setDescription("Expulsa al usuario")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addStringOption((option) =>
              option.setName("reason").setDescription("Razón obligatoria").setRequired(true).setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("ban")
            .setDescription("Banea al usuario")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addStringOption((option) =>
              option.setName("reason").setDescription("Razón obligatoria").setRequired(true).setMaxLength(500)
            )
            .addBooleanOption((option) =>
              option
                .setName("softban")
                .setDescription("Softban (ban + unban para limpiar mensajes)")
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("unban")
            .setDescription("Quita un ban")
            .addStringOption((option) =>
              option.setName("user_id").setDescription("ID del usuario").setRequired(true)
            )
            .addStringOption((option) =>
              option.setName("reason").setDescription("Razón obligatoria").setRequired(true).setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("timeout")
            .setDescription("Mute temporal")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addIntegerOption((option) =>
              option
                .setName("minutes")
                .setDescription("Duración en minutos")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
            )
            .addStringOption((option) =>
              option.setName("reason").setDescription("Razón obligatoria").setRequired(true).setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("purge")
            .setDescription("Borra mensajes en lote")
            .addIntegerOption((option) =>
              option
                .setName("amount")
                .setDescription("Cantidad a borrar")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
            )
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Razón obligatoria")
                .setRequired(true)
                .setMaxLength(500)
            )
        )
        .addSubcommandGroup((group) =>
          group
            .setName("case")
            .setDescription("Consulta de casos")
            .addSubcommand((subcommand) =>
              subcommand
                .setName("view")
                .setDescription("Ver caso de moderación")
                .addIntegerOption((option) =>
                  option
                    .setName("number")
                    .setDescription("Número de caso")
                    .setRequired(true)
                    .setMinValue(1)
                )
            )
        )
    );
  }
}

import { SlashCommandBuilder } from "discord.js";

import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { AssignRoleCommand } from "@contexts/roles/application/commands/AssignRoleCommand";
import { AssignRoleHandler } from "@contexts/roles/application/commands/AssignRoleHandler";
import { RemoveRoleCommand } from "@contexts/roles/application/commands/RemoveRoleCommand";
import { RemoveRoleHandler } from "@contexts/roles/application/commands/RemoveRoleHandler";
import { ListConfigurableRolesQuery } from "@contexts/roles/application/queries/ListConfigurableRolesQuery";
import { ListConfigurableRolesHandler } from "@contexts/roles/application/queries/ListConfigurableRolesHandler";
import { OnRoleDeletedHandler } from "@contexts/roles/application/events/OnRoleDeletedHandler";
import { MongoRoleConfigurationRepository } from "@contexts/roles/infrastructure/persistence/MongoRoleConfigurationRepository";
import { DiscordRoleManagementAdapter } from "@contexts/roles/infrastructure/discord/DiscordRoleManagementAdapter";

export class RolesModule implements BotModule {
  public readonly name = "roles";

  public async register(context: AppContext): Promise<void> {
    const repository = new MongoRoleConfigurationRepository(context.mongo.getDatabase());
    await repository.init();

    const roleGateway = new DiscordRoleManagementAdapter(context.discord);

    context.commandBus.register(AssignRoleCommand.type, new AssignRoleHandler(roleGateway, repository));
    context.commandBus.register(RemoveRoleCommand.type, new RemoveRoleHandler(roleGateway));
    context.queryBus.register(
      ListConfigurableRolesQuery.type,
      new ListConfigurableRolesHandler(roleGateway, repository)
    );

    context.eventBus.subscribe("RoleDeleted", new OnRoleDeletedHandler(repository).build());

    (context as unknown as { roleConfigurationRepository: MongoRoleConfigurationRepository }).roleConfigurationRepository =
      repository;
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    registry.add(
      new SlashCommandBuilder()
        .setName("role")
        .setDescription("Gestión de roles")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Asigna un rol a un usuario")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addRoleOption((option) => option.setName("role").setDescription("Rol a asignar").setRequired(true))
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Razón de auditoría")
                .setRequired(false)
                .setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Quita un rol a un usuario")
            .addUserOption((option) => option.setName("user").setDescription("Usuario objetivo").setRequired(true))
            .addRoleOption((option) => option.setName("role").setDescription("Rol a remover").setRequired(true))
            .addStringOption((option) =>
              option
                .setName("reason")
                .setDescription("Razón de auditoría")
                .setRequired(false)
                .setMaxLength(500)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("list").setDescription("Lista roles configurables para gestión")
        )
    );
  }
}

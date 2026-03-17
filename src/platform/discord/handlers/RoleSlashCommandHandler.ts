import { EmbedBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";

import { AssignRoleCommand } from "@contexts/roles/application/commands/AssignRoleCommand";
import { RemoveRoleCommand } from "@contexts/roles/application/commands/RemoveRoleCommand";
import { ListConfigurableRolesQuery } from "@contexts/roles/application/queries/ListConfigurableRolesQuery";
import type { ConfigurableRoleView } from "@contexts/roles/application/queries/ListConfigurableRolesQuery";

export class RoleSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "role";
  private readonly authorizationService: CommandAuthorizationService;

  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus,
    discordGateway: import("@platform/discord/DiscordGateway").DiscordGateway
  ) {
    this.authorizationService = new CommandAuthorizationService(this.queryBus, discordGateway);
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await this.authorizationService.assertRoleManager(interaction);
    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guildId as string;

    if (subcommand === "add") {
      const user = interaction.options.getUser("user", true);
      const role = interaction.options.getRole("role", true);
      const reason =
        interaction.options.getString("reason") ??
        `Rol asignado por ${interaction.user.tag} (${interaction.user.id})`;

      await this.commandBus.execute(
        new AssignRoleCommand({
          guildId,
          actorUserId: interaction.user.id,
          targetUserId: user.id,
          roleId: role.id,
          reason
        })
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Rol asignado")
            .setDescription(`Se asignó <@&${role.id}> a <@${user.id}>`)
        ]
      });
      return;
    }

    if (subcommand === "remove") {
      const user = interaction.options.getUser("user", true);
      const role = interaction.options.getRole("role", true);
      const reason =
        interaction.options.getString("reason") ??
        `Rol removido por ${interaction.user.tag} (${interaction.user.id})`;

      await this.commandBus.execute(
        new RemoveRoleCommand({
          guildId,
          actorUserId: interaction.user.id,
          targetUserId: user.id,
          roleId: role.id,
          reason
        })
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x8f3a2f)
            .setTitle("Rol removido")
            .setDescription(`Se removió <@&${role.id}> de <@${user.id}>`)
        ]
      });
      return;
    }

    if (subcommand === "list") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
        await this.authorizationService.assertRoleManager(interaction);
      }

      const roles = await this.queryBus.execute<ConfigurableRoleView[]>(
        new ListConfigurableRolesQuery({ guildId })
      );
      const content = roles
        .slice(0, 25)
        .map(
          (role) =>
            `${role.configurable ? "[configurable]" : "[no configurable]"} <@&${role.id}> (${role.id})`
        )
        .join("\n");

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x1f4d78)
            .setTitle("Roles configurables")
            .setDescription(content.length > 0 ? content : "No hay roles para listar")
        ]
      });
    }
  }
}

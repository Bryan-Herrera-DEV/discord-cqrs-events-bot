import type { ChatInputCommandInteraction } from "discord.js";

import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";
import { infoEmbed, successEmbed } from "@platform/discord/MessageEmbeds";

const commonCommands = [
  "`/help`: Muestra esta guía rápida de comandos.",
  "`/level me [user]`: Consulta tu nivel o el de otro usuario.",
  "`/level leaderboard [limit]`: Muestra el ranking de XP del servidor."
].join("\n");

const adminCommands = [
  "`/admin ping`: Verifica estado y latencia del bot.",
  "`/admin config ...`: Configura idioma, logs y flags del servidor.",
  "`/admin levels ...`: Configura alertas y canal de subida de nivel.",
  "`/mod ...`: Ejecuta acciones de moderación y consulta casos.",
  "`/role ...`: Gestiona roles configurables para miembros."
].join("\n");

export class HelpSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "help";
  private readonly authorizationService: CommandAuthorizationService;

  public constructor(
    private readonly queryBus: InMemoryQueryBus,
    discordGateway: import("@platform/discord/DiscordGateway").DiscordGateway
  ) {
    this.authorizationService = new CommandAuthorizationService(this.queryBus, discordGateway);
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const isAdmin = await this.authorizationService.isAdmin(interaction);

    const embed = (
      isAdmin
        ? successEmbed(
            "Centro de ayuda (admin)",
            "Ves los comandos para usuarios y también los comandos de administración."
          )
        : infoEmbed("Centro de ayuda", "Comandos disponibles para usuarios del servidor.")
    )
      .addFields({
        name: "Comandos para todos",
        value: commonCommands
      })
      .setFooter({
        text: isAdmin
          ? "Tip: usa permisos y roles para delegar acceso"
          : "Tip: si eres admin verás una sección extra"
      });

    if (isAdmin) {
      embed.addFields({
        name: "Comandos de administración",
        value: adminCommands
      });
    }

    await interaction.reply({
      ephemeral: true,
      embeds: [embed]
    });
  }
}

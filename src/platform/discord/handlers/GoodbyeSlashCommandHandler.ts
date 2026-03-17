import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";

import { SetupGoodbyeCommand } from "@contexts/goodbye/application/commands/SetupGoodbyeCommand";
import { ToggleGoodbyeCommand } from "@contexts/goodbye/application/commands/ToggleGoodbyeCommand";

export class GoodbyeSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "goodbye";
  private readonly authorizationService: CommandAuthorizationService;

  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus,
    discordGateway: import("@platform/discord/DiscordGateway").DiscordGateway
  ) {
    this.authorizationService = new CommandAuthorizationService(this.queryBus, discordGateway);
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    await this.authorizationService.assertAdmin(interaction);
    const guildId = interaction.guildId as string;
    const subcommand = interaction.options.getSubcommand(true);

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template") ?? undefined;
      await this.commandBus.execute(
        new SetupGoodbyeCommand({
          guildId,
          changedBy: interaction.user.id,
          channelId: channel?.id,
          template
        })
      );

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Goodbye configurado")
            .setDescription("La configuración de despedida fue guardada")
        ]
      });
      return;
    }

    if (subcommand === "toggle") {
      const enabled = interaction.options.getBoolean("enabled", true);
      await this.commandBus.execute(
        new ToggleGoodbyeCommand({
          guildId,
          changedBy: interaction.user.id,
          enabled
        })
      );

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x1f4d78)
            .setTitle("Estado de despedidas actualizado")
            .setDescription(`Despedidas ${enabled ? "activadas" : "desactivadas"}`)
        ]
      });
    }
  }
}

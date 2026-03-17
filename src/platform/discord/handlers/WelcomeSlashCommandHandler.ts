import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { CommandAuthorizationService } from "@platform/discord/CommandAuthorizationService";

import { SetupWelcomeCommand } from "@contexts/welcome/application/commands/SetupWelcomeCommand";
import { GetWelcomeConfigurationQuery } from "@contexts/welcome/application/queries/GetWelcomeConfigurationQuery";
import type { WelcomeConfiguration } from "@contexts/welcome/domain/WelcomeConfiguration";

const renderPreview = (template: string, userId: string, displayName: string, guildId: string): string =>
  template
    .replaceAll("{user}", `<@${userId}>`)
    .replaceAll("{displayName}", displayName)
    .replaceAll("{username}", displayName)
    .replaceAll("{guild}", guildId);

export class WelcomeSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "welcome";
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
      const enabled = interaction.options.getBoolean("enabled") ?? undefined;
      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template") ?? undefined;
      const useImage = interaction.options.getBoolean("use_image") ?? undefined;

      await this.commandBus.execute(
        new SetupWelcomeCommand({
          guildId,
          changedBy: interaction.user.id,
          enabled,
          channelId: channel?.id,
          template,
          useImage
        })
      );

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Welcome configurado")
            .setDescription("La configuración de bienvenida fue guardada correctamente")
        ]
      });
      return;
    }

    if (subcommand === "preview") {
      const configuration = await this.queryBus.execute<WelcomeConfiguration>(
        new GetWelcomeConfigurationQuery({ guildId })
      );
      const preview = renderPreview(configuration.template, interaction.user.id, interaction.user.username, guildId);
      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(configuration.branding.accentColor)
            .setTitle("Preview bienvenida")
            .setDescription(preview)
        ]
      });
    }
  }
}

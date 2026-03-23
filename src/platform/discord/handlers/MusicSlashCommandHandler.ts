import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import { ValidationError } from "@shared/application/errors";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";
import { EnqueueMusicTrackCommand } from "@contexts/music/application/commands/EnqueueMusicTrackCommand";
import type { EnqueueMusicTrackResult } from "@contexts/music/application/ports/MusicPlaybackPort";
import { SkipMusicTrackCommand } from "@contexts/music/application/commands/SkipMusicTrackCommand";
import type { SkipMusicTrackResult } from "@contexts/music/application/ports/MusicPlaybackPort";
import { GetMusicQueueQuery } from "@contexts/music/application/queries/GetMusicQueueQuery";
import type { MusicQueueSnapshot } from "@contexts/music/domain/MusicTrack";
import { buildMusicControls, buildMusicQueueEmbed } from "@platform/discord/handlers/MusicEmbeds";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export class MusicSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "music";

  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus
  ) {}

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);
    const guildId = await this.assertMusicChannel(interaction);

    if (subcommand === "play") {
      await interaction.deferReply();

      const query = interaction.options.getString("query", true);
      const result = await this.commandBus.execute<EnqueueMusicTrackResult>(
        new EnqueueMusicTrackCommand({
          guildId,
          query,
          requestedByUserId: interaction.user.id,
          requestedInChannelId: interaction.channelId
        })
      );

      const queue = await this.queryBus.execute<MusicQueueSnapshot>(
        new GetMusicQueueQuery({ guildId })
      );

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle(result.startedPlayback ? "Reproduciendo musica" : "Cancion agregada")
            .setDescription(
              [
                `Track: [${result.addedTrack.title}](${result.addedTrack.url})`,
                `En cola: ${result.totalTracksInQueue}`,
                `Canal de voz: ${result.voiceChannelName ?? "Sin canal"}`
              ].join("\n")
            )
        ],
        components: [buildMusicControls(queue)]
      });
      return;
    }

    if (subcommand === "skip") {
      const result = await this.commandBus.execute<SkipMusicTrackResult>(
        new SkipMusicTrackCommand({
          guildId,
          requestedByUserId: interaction.user.id
        })
      );

      if (!result.skipped) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1f4d78)
              .setTitle("No hay cancion activa")
              .setDescription("No hay una cancion en reproduccion para saltar.")
          ],
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Cambiando de cancion")
            .setDescription(
              [
                `Se salto: ${result.previousTrack ? `[${result.previousTrack.title}](${result.previousTrack.url})` : "N/A"}`,
                `Siguiente: ${result.nextTrack ? `[${result.nextTrack.title}](${result.nextTrack.url})` : "La cola quedo vacia"}`
              ].join("\n")
            )
        ],
        components: [
          buildMusicControls(
            await this.queryBus.execute<MusicQueueSnapshot>(new GetMusicQueueQuery({ guildId }))
          )
        ]
      });
      return;
    }

    if (subcommand === "queue") {
      const queue = await this.queryBus.execute<MusicQueueSnapshot>(
        new GetMusicQueueQuery({ guildId })
      );
      await interaction.reply({
        embeds: [buildMusicQueueEmbed(queue)],
        components: [buildMusicControls(queue)]
      });
      return;
    }

    if (subcommand === "panel") {
      const queue = await this.queryBus.execute<MusicQueueSnapshot>(
        new GetMusicQueueQuery({ guildId })
      );
      await interaction.reply({
        embeds: [buildMusicQueueEmbed(queue, "Panel de musica")],
        components: [buildMusicControls(queue)]
      });
    }
  }

  private async assertMusicChannel(interaction: ChatInputCommandInteraction): Promise<string> {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw new ValidationError("Este comando solo puede ejecutarse en un servidor.");
    }

    const settings = await this.queryBus.execute<GuildSettings>(
      new GetGuildSettingsQuery({ guildId })
    );
    const musicChannelId = settings.channels.musicCommandChannelId;
    if (!musicChannelId) {
      throw new ValidationError(
        "No hay canal de musica configurado. Configuralo en el panel admin antes de usar /music."
      );
    }

    if (interaction.channelId !== musicChannelId) {
      throw new ValidationError(`Usa este comando en <#${musicChannelId}>.`);
    }

    return guildId;
  }
}

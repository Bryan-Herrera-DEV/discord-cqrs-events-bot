import { EmbedBuilder, type ButtonInteraction } from "discord.js";

import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import { SkipMusicTrackCommand } from "@contexts/music/application/commands/SkipMusicTrackCommand";
import type {
  SkipMusicTrackResult,
  StopMusicResult,
  ToggleMusicPauseResult
} from "@contexts/music/application/ports/MusicPlaybackPort";
import { GetMusicQueueQuery } from "@contexts/music/application/queries/GetMusicQueueQuery";
import type { MusicQueueSnapshot } from "@contexts/music/domain/MusicTrack";
import { StopMusicCommand } from "@contexts/music/application/commands/StopMusicCommand";
import { ToggleMusicPauseCommand } from "@contexts/music/application/commands/ToggleMusicPauseCommand";
import { buildMusicControls, buildMusicQueueEmbed } from "@platform/discord/handlers/MusicEmbeds";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";

export class MusicButtonInteractionHandler {
  public constructor(
    private readonly commandBus: InMemoryCommandBus,
    private readonly queryBus: InMemoryQueryBus
  ) {}

  public async handle(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.customId.startsWith("music:")) {
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        ephemeral: true,
        content: "Este boton solo funciona dentro de un servidor."
      });
      return;
    }

    const settings = await this.queryBus.execute<GuildSettings>(
      new GetGuildSettingsQuery({ guildId })
    );
    const musicChannelId = settings.channels.musicCommandChannelId;
    if (!musicChannelId || interaction.channelId !== musicChannelId) {
      await interaction.reply({
        ephemeral: true,
        content: "Este control solo funciona en el canal de musica configurado."
      });
      return;
    }

    if (interaction.customId === "music:skip") {
      const result = await this.commandBus.execute<SkipMusicTrackResult>(
        new SkipMusicTrackCommand({
          guildId,
          requestedByUserId: interaction.user.id
        })
      );

      if (!result.skipped) {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x1f4d78)
              .setTitle("No hay cancion activa")
              .setDescription("No existe una cancion en reproduccion para saltar.")
          ]
        });
        await this.refreshControlButtons(interaction, guildId);
        return;
      }

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle("Se paso a la siguiente cancion")
            .setDescription(
              result.nextTrack
                ? `Siguiente: [${result.nextTrack.title}](${result.nextTrack.url})`
                : "La cola quedo vacia."
            )
        ]
      });
      await this.refreshControlButtons(interaction, guildId);
      return;
    }

    if (interaction.customId === "music:toggle-pause") {
      const result = await this.commandBus.execute<ToggleMusicPauseResult>(
        new ToggleMusicPauseCommand({
          guildId,
          requestedByUserId: interaction.user.id
        })
      );

      if (!result.changed) {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x1f4d78)
              .setTitle("No se pudo cambiar estado")
              .setDescription("No hay una cancion activa para pausar o reanudar.")
          ]
        });
        await this.refreshControlButtons(interaction, guildId);
        return;
      }

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0x2d7a46)
            .setTitle(result.paused ? "Reproduccion pausada" : "Reproduccion reanudada")
            .setDescription(
              result.currentTrack
                ? `[${result.currentTrack.title}](${result.currentTrack.url})`
                : "Estado actualizado"
            )
        ]
      });
      await this.refreshControlButtons(interaction, guildId);
      return;
    }

    if (interaction.customId === "music:stop") {
      const result = await this.commandBus.execute<StopMusicResult>(
        new StopMusicCommand({
          guildId,
          requestedByUserId: interaction.user.id
        })
      );

      if (!result.stopped) {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            new EmbedBuilder()
              .setColor(0x1f4d78)
              .setTitle("Nada para detener")
              .setDescription("No habia reproduccion activa ni canciones pendientes.")
          ]
        });
        await this.refreshControlButtons(interaction, guildId);
        return;
      }

      await interaction.reply({
        ephemeral: true,
        embeds: [
          new EmbedBuilder()
            .setColor(0xb33939)
            .setTitle("Reproduccion detenida")
            .setDescription(
              [
                result.previousTrack
                  ? `Ultima cancion: [${result.previousTrack.title}](${result.previousTrack.url})`
                  : "Sin cancion activa",
                `Elementos limpiados de cola: ${result.clearedTracks}`
              ].join("\n")
            )
        ]
      });
      await this.refreshControlButtons(interaction, guildId);
      return;
    }

    if (interaction.customId === "music:queue") {
      const queue = await this.queryBus.execute<MusicQueueSnapshot>(
        new GetMusicQueueQuery({ guildId })
      );
      await interaction.reply({
        ephemeral: true,
        embeds: [buildMusicQueueEmbed(queue)],
        components: [buildMusicControls(queue)]
      });
      await this.refreshControlButtons(interaction, guildId);
    }
  }

  private async refreshControlButtons(
    interaction: ButtonInteraction,
    guildId: string
  ): Promise<void> {
    try {
      const queue = await this.queryBus.execute<MusicQueueSnapshot>(
        new GetMusicQueueQuery({ guildId })
      );
      if (!interaction.message.editable) {
        return;
      }

      await interaction.message.edit({
        components: [buildMusicControls(queue)]
      });
    } catch {
      return;
    }
  }
}

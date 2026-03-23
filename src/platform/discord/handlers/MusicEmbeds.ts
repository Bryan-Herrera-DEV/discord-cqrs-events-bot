import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

import type { MusicQueueSnapshot } from "@contexts/music/domain/MusicTrack";

const formatDuration = (durationSeconds: number): string => {
  const total =
    Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const buildMusicQueueEmbed = (
  queue: MusicQueueSnapshot,
  title = "Cola de musica"
): EmbedBuilder => {
  const playbackState = queue.currentTrack ? (queue.isPaused ? "Pausado" : "Activo") : "Detenido";

  const nowPlaying = queue.currentTrack
    ? `[${queue.currentTrack.title}](${queue.currentTrack.url}) (${formatDuration(
        queue.currentTrack.durationSeconds
      )})`
    : "Nada en reproduccion";

  const upcoming =
    queue.queuedTracks.length === 0
      ? "Sin canciones en espera"
      : queue.queuedTracks
          .slice(0, 10)
          .map(
            (track, index) =>
              `${index + 1}. [${track.title}](${track.url}) (${formatDuration(track.durationSeconds)})`
          )
          .join("\n");

  return new EmbedBuilder()
    .setColor(0x15568d)
    .setTitle(title)
    .setDescription(
      [
        `Canal de voz: ${queue.voiceChannelName ?? "No conectado"}`,
        `Reproduciendo: ${nowPlaying}`,
        `Estado: ${playbackState}`,
        `En cola: ${queue.queuedTracks.length}`
      ].join("\n")
    )
    .addFields({
      name: "Siguientes canciones",
      value: upcoming
    });
};

export const buildMusicControls = (queue: MusicQueueSnapshot): ActionRowBuilder<ButtonBuilder> => {
  const hasCurrentTrack = Boolean(queue.currentTrack);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("music:skip")
      .setLabel("Siguiente")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!hasCurrentTrack),
    new ButtonBuilder()
      .setCustomId("music:toggle-pause")
      .setLabel(queue.isPaused ? "Reanudar" : "Pausar")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasCurrentTrack),
    new ButtonBuilder()
      .setCustomId("music:stop")
      .setLabel("Detener")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!hasCurrentTrack),
    new ButtonBuilder()
      .setCustomId("music:queue")
      .setLabel("Ver cola")
      .setStyle(ButtonStyle.Secondary)
  );
};

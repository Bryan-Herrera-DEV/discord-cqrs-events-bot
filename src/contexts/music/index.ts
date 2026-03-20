import { SlashCommandBuilder } from "discord.js";
import ffmpegStatic from "ffmpeg-static";

import { env } from "@config/env";
import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";
import type { MusicPlaybackPort } from "@contexts/music/application/ports/MusicPlaybackPort";
import { EnqueueMusicTrackCommand } from "@contexts/music/application/commands/EnqueueMusicTrackCommand";
import { EnqueueMusicTrackHandler } from "@contexts/music/application/commands/EnqueueMusicTrackHandler";
import { SkipMusicTrackCommand } from "@contexts/music/application/commands/SkipMusicTrackCommand";
import { SkipMusicTrackHandler } from "@contexts/music/application/commands/SkipMusicTrackHandler";
import { ToggleMusicPauseCommand } from "@contexts/music/application/commands/ToggleMusicPauseCommand";
import { ToggleMusicPauseHandler } from "@contexts/music/application/commands/ToggleMusicPauseHandler";
import { StopMusicCommand } from "@contexts/music/application/commands/StopMusicCommand";
import { StopMusicHandler } from "@contexts/music/application/commands/StopMusicHandler";
import { GetMusicQueueQuery } from "@contexts/music/application/queries/GetMusicQueueQuery";
import { GetMusicQueueHandler } from "@contexts/music/application/queries/GetMusicQueueHandler";
import { DiscordMusicPlaybackService } from "@contexts/music/infrastructure/discord/DiscordMusicPlaybackService";

export class MusicModule implements BotModule {
  public readonly name = "music";

  public async register(context: AppContext): Promise<void> {
    const ffmpegPath =
      env.FFMPEG_PATH ??
      (typeof ffmpegStatic === "string" && ffmpegStatic.length > 0 ? ffmpegStatic : undefined);

    const playback = await DiscordMusicPlaybackService.create(
      context.discord,
      context.logger.child({ module: "music" }),
      {
        ffmpegPath,
        youtubeCookie: env.YOUTUBE_COOKIE
      }
    );

    context.logger.info("music.runtime.dependencies", {
      hasYoutubeCookie: Boolean(env.YOUTUBE_COOKIE),
      ffmpegSource: env.FFMPEG_PATH ? "env" : ffmpegPath ? "ffmpeg-static" : "system"
    });

    context.commandBus.register(
      EnqueueMusicTrackCommand.type,
      new EnqueueMusicTrackHandler(playback)
    );
    context.commandBus.register(SkipMusicTrackCommand.type, new SkipMusicTrackHandler(playback));
    context.commandBus.register(
      ToggleMusicPauseCommand.type,
      new ToggleMusicPauseHandler(playback)
    );
    context.commandBus.register(StopMusicCommand.type, new StopMusicHandler(playback));
    context.queryBus.register(GetMusicQueueQuery.type, new GetMusicQueueHandler(playback));

    (context as unknown as { musicPlaybackService: MusicPlaybackPort }).musicPlaybackService =
      playback;
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    registry.add(
      new SlashCommandBuilder()
        .setName("music")
        .setDescription("Reproduccion de musica desde Spotify")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("play")
            .setDescription("Agrega una cancion de Spotify a la cola")
            .addStringOption((option) =>
              option.setName("query").setDescription("URL o nombre de la cancion").setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("skip").setDescription("Pasa a la siguiente cancion")
        )
        .addSubcommand((subcommand) =>
          subcommand.setName("queue").setDescription("Muestra la cola de canciones")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("panel")
            .setDescription("Publica panel con botones para controlar la musica")
        )
    );
  }
}

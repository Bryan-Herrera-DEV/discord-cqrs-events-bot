import { Player, type GuildNodeCreateOptions, type GuildQueue, type Track } from "discord-player";
import { DefaultExtractors } from "@discord-player/extractor";
import { Downloader, ytdl } from "@discord-player/downloader";
import type { Readable } from "node:stream";

import type {
  EnqueueMusicTrackInput,
  EnqueueMusicTrackResult,
  MusicPlaybackPort,
  SkipMusicTrackInput,
  SkipMusicTrackResult,
  StopMusicResult,
  ToggleMusicPauseResult
} from "@contexts/music/application/ports/MusicPlaybackPort";
import type { MusicQueueSnapshot, MusicTrack } from "@contexts/music/domain/MusicTrack";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";
import { ValidationError } from "@shared/application/errors";
import type { Logger } from "@shared/infrastructure/logger/Logger";

const toMusicTrack = (
  track: Track | null | undefined,
  fallbackRequestedBy?: string
): MusicTrack | null => {
  if (!track) {
    return null;
  }

  return {
    title: track.title,
    url: track.url,
    durationSeconds: Math.max(0, Math.floor(track.durationMS / 1000)),
    requestedByUserId: track.requestedBy?.id ?? fallbackRequestedBy ?? "unknown"
  };
};

const STREAM_EXTRACTION_ERROR_CODES = new Set(["ERR_NO_RESULT", "ERR_NO_STREAM"]);
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const BARE_SPOTIFY_URL_PATTERN = /^(?:open|play)\.spotify\.com\//i;
const SPOTIFY_HOSTS = new Set(["open.spotify.com", "play.spotify.com"]);
const SPOTIFY_PATH_PATTERN = /^\/(?:(?:intl-[a-z]{2})\/)?(track|album|playlist)\/([a-z0-9]+)$/i;

const DEFAULT_QUEUE_OPTIONS: GuildNodeCreateOptions = {
  selfDeaf: true,
  leaveOnEmpty: true,
  leaveOnEmptyCooldown: 60_000,
  leaveOnEnd: true,
  leaveOnEndCooldown: 60_000,
  leaveOnStop: true,
  bufferingTimeout: 20_000,
  pauseOnEmpty: true,
  preferBridgedMetadata: true,
  disableBiquad: true
};

interface DiscordMusicPlaybackServiceOptions {
  ffmpegPath?: string;
  youtubeCookie?: string;
}

interface YtDlpSearchEntry {
  webpage_url?: string;
  id?: string;
}

interface YtDlpSearchResponse {
  entries?: YtDlpSearchEntry[];
  webpage_url?: string;
  id?: string;
}

type SpotifyEntityType = "track" | "album" | "playlist";

interface ResolvedPlaybackQuery {
  value: string;
  entityType: SpotifyEntityType;
}

const resolvePlaybackQuery = (rawQuery: string): ResolvedPlaybackQuery => {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    throw new ValidationError("Debes enviar un enlace de Spotify valido.");
  }

  const withScheme =
    URL_SCHEME_PATTERN.test(trimmedQuery) || !BARE_SPOTIFY_URL_PATTERN.test(trimmedQuery)
      ? trimmedQuery
      : `https://${trimmedQuery}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new ValidationError("Solo se aceptan enlaces de Spotify.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!SPOTIFY_HOSTS.has(hostname)) {
    throw new ValidationError("Solo se aceptan enlaces de Spotify.");
  }

  const normalizedPath = parsed.pathname.replace(/\/+$/, "");
  const match = normalizedPath.match(SPOTIFY_PATH_PATTERN);
  if (!match) {
    throw new ValidationError(
      "El enlace debe ser de Spotify y apuntar a un track, album o playlist."
    );
  }

  const [, rawEntityType = "", entityId = ""] = match;
  if (!rawEntityType || !entityId) {
    throw new ValidationError(
      "El enlace debe ser de Spotify y apuntar a un track, album o playlist."
    );
  }

  const entityType = rawEntityType.toLowerCase() as SpotifyEntityType;

  return {
    value: `https://open.spotify.com/${entityType}/${entityId}`,
    entityType
  };
};

const getErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") {
    return code;
  }

  if (typeof code === "number") {
    return String(code);
  }

  return undefined;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const getConnectionDiagnostics = (
  queue: GuildQueue
): {
  connectionStatus?: string;
  connectionCloseCode?: number;
  connectionDisconnectReason?: string;
} => {
  const state = queue.connection?.state as
    | {
        status?: unknown;
        closeCode?: unknown;
        reason?: unknown;
      }
    | undefined;

  return {
    connectionStatus: typeof state?.status === "string" ? state.status : undefined,
    connectionCloseCode: typeof state?.closeCode === "number" ? state.closeCode : undefined,
    connectionDisconnectReason: typeof state?.reason === "string" ? state.reason : undefined
  };
};

const isStreamExtractionError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  if (code && STREAM_EXTRACTION_ERROR_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return message.includes("could not extract stream") || message.includes("no stream");
};

const toCanonicalYoutubeWatchUrl = (videoId: string): string =>
  `https://www.youtube.com/watch?v=${videoId}`;

export class DiscordMusicPlaybackService implements MusicPlaybackPort {
  private readonly player: Player;
  private readonly requestOptions?: {
    headers: {
      cookie: string;
    };
  };
  private readonly spotifyBridgeUrlCache = new Map<string, string>();

  private constructor(
    private readonly discord: DiscordGateway,
    private readonly logger: Logger,
    options?: DiscordMusicPlaybackServiceOptions
  ) {
    this.player = new Player(this.discord.getClient(), {
      skipFFmpeg: false,
      ffmpegPath: options?.ffmpegPath
    });

    if (options?.youtubeCookie) {
      this.requestOptions = {
        headers: {
          cookie: options.youtubeCookie
        }
      };
    }

    // this.bindQueueEventHandlers(); ! Esto es solo un debugger, se puede habilitar para desarrollo local pero no conviene en produccion porque puede generar demasiados logs
  }

  public static async create(
    discord: DiscordGateway,
    logger: Logger,
    options?: DiscordMusicPlaybackServiceOptions
  ): Promise<DiscordMusicPlaybackService> {
    const service = new DiscordMusicPlaybackService(discord, logger, options);
    await service.registerExtractors();
    return service;
  }

  public async enqueue(input: EnqueueMusicTrackInput): Promise<EnqueueMusicTrackResult> {
    const resolvedQuery = resolvePlaybackQuery(input.query);

    let queue = this.player.nodes.get(input.guildId);
    let channelIdToUse = queue?.channel?.id;

    if (channelIdToUse) {
      const humansInCurrentChannel = await this.discord.getVoiceChannelHumanCount(
        input.guildId,
        channelIdToUse
      );

      if (humansInCurrentChannel === 0) {
        queue?.delete();
        queue = null;
        channelIdToUse = undefined;
      }
    }

    if (!channelIdToUse) {
      const mostPopulated = await this.discord.getMostPopulatedVoiceChannel(input.guildId);
      if (!mostPopulated) {
        throw new ValidationError(
          "No hay participantes en canales de voz. El bot no puede unirse para reproducir musica."
        );
      }

      channelIdToUse = mostPopulated.channelId;
    }

    const playbackQueue = await this.getOrCreateQueue(input.guildId, channelIdToUse);
    const hadCurrentTrack = Boolean(playbackQueue.currentTrack);

    let playResult: Awaited<ReturnType<GuildQueue["play"]>>;
    let usedSpotifyFallback = false;
    try {
      playResult = await playbackQueue.play(resolvedQuery.value, {
        requestedBy: input.requestedByUserId,
        searchEngine: "auto",
        fallbackSearchEngine: "youtubeSearch",
        requestOptions: this.requestOptions
      });
    } catch (error) {
      if (isStreamExtractionError(error) && resolvedQuery.entityType === "track") {
        const fallbackPlayResult = await this.trySpotifyYoutubeFallback(
          playbackQueue,
          resolvedQuery.value,
          input.requestedByUserId
        );

        if (fallbackPlayResult) {
          playResult = fallbackPlayResult;
          usedSpotifyFallback = true;
        } else {
          this.logger.warn("music.playback.spotify-fallback.unavailable", {
            guildId: input.guildId,
            spotifyUrl: resolvedQuery.value,
            requestedByUserId: input.requestedByUserId,
            errorCode: getErrorCode(error),
            errorMessage: getErrorMessage(error)
          });

          throw new ValidationError(
            "No se pudo obtener el audio de ese track de Spotify. Intenta con otro enlace de Spotify."
          );
        }
      } else if (isStreamExtractionError(error)) {
        this.logger.warn("music.playback.stream-unavailable", {
          guildId: input.guildId,
          query: input.query,
          resolvedQuery: resolvedQuery.value,
          requestedByUserId: input.requestedByUserId,
          errorCode: getErrorCode(error),
          errorMessage: getErrorMessage(error)
        });

        throw new ValidationError(
          "No se pudo obtener el audio de esa cancion en este momento. Intenta otra cancion o vuelve a intentarlo en unos minutos."
        );
      } else {
        throw error;
      }
    }

    if (usedSpotifyFallback) {
      this.logger.info("music.playback.spotify-fallback.used", {
        guildId: input.guildId,
        query: input.query,
        resolvedQuery: resolvedQuery.value,
        requestedByUserId: input.requestedByUserId,
        selectedTrackUrl: playResult.track.url,
        selectedTrackTitle: playResult.track.title
      });
    }

    const snapshot = this.buildQueueSnapshot(playResult.queue);
    if (!snapshot.currentTrack) {
      throw new ValidationError(
        "No se pudo iniciar la reproduccion. Intenta nuevamente con otra cancion."
      );
    }

    return {
      addedTrack: toMusicTrack(playResult.track, input.requestedByUserId) as MusicTrack,
      startedPlayback:
        !hadCurrentTrack && playResult.queue.currentTrack?.id === playResult.track.id,
      totalTracksInQueue: snapshot.queuedTracks.length + (snapshot.currentTrack ? 1 : 0),
      voiceChannelName: snapshot.voiceChannelName
    };
  }

  public async skip(input: SkipMusicTrackInput): Promise<SkipMusicTrackResult> {
    const queue = this.player.nodes.get(input.guildId);
    if (!queue?.currentTrack) {
      return { skipped: false };
    }

    const previousTrack = toMusicTrack(queue.currentTrack, input.requestedByUserId) as MusicTrack;
    const nextTrack = toMusicTrack(queue.tracks.at(0));
    const skipped = queue.node.skip();

    if (!skipped) {
      return { skipped: false };
    }

    return {
      skipped: true,
      previousTrack,
      nextTrack
    };
  }

  public async togglePause(guildId: string): Promise<ToggleMusicPauseResult> {
    const queue = this.player.nodes.get(guildId);
    if (!queue?.currentTrack) {
      return {
        changed: false,
        paused: false
      };
    }

    const nextPausedState = !queue.node.isPaused();
    const changed = queue.node.setPaused(nextPausedState);

    return {
      changed,
      paused: changed ? nextPausedState : queue.node.isPaused(),
      currentTrack: toMusicTrack(queue.currentTrack) ?? undefined
    };
  }

  public async stop(guildId: string): Promise<StopMusicResult> {
    const queue = this.player.nodes.get(guildId);
    if (!queue) {
      return {
        stopped: false,
        clearedTracks: 0
      };
    }

    const previousTrack = toMusicTrack(queue.currentTrack) ?? undefined;
    const clearedTracks = queue.tracks.size + (queue.currentTrack ? 1 : 0);

    if (clearedTracks === 0) {
      return {
        stopped: false,
        clearedTracks: 0
      };
    }

    queue.delete();

    return {
      stopped: true,
      clearedTracks,
      previousTrack
    };
  }

  public async getQueue(guildId: string): Promise<MusicQueueSnapshot> {
    return this.buildQueueSnapshot(this.player.nodes.get(guildId));
  }

  public async handleVoiceStateUpdate(guildId: string): Promise<void> {
    const queue = this.player.nodes.get(guildId);
    if (!queue?.channel) {
      return;
    }

    if (queue.options.leaveOnEmpty) {
      return;
    }

    try {
      const humansInChannel = await this.discord.getVoiceChannelHumanCount(
        guildId,
        queue.channel.id
      );
      if (humansInChannel > 0) {
        return;
      }

      const voiceChannelId = queue.channel.id;
      const pendingTracks = queue.tracks.size + (queue.currentTrack ? 1 : 0);
      queue.delete();

      this.logger.info("music.voice.empty.disconnect", {
        guildId,
        voiceChannelId,
        pendingTracks
      });
    } catch (error) {
      this.logger.warn("music.voice.state-sync.failed", {
        guildId,
        error
      });
    }
  }

  private buildQueueSnapshot(queue: GuildQueue | null): MusicQueueSnapshot {
    if (!queue) {
      return {
        currentTrack: null,
        queuedTracks: [],
        isPaused: false
      };
    }

    return {
      currentTrack: toMusicTrack(queue.currentTrack),
      queuedTracks: queue.tracks.toArray().map((track) => toMusicTrack(track) as MusicTrack),
      isPaused: queue.node.isPaused(),
      voiceChannelId: queue.channel?.id,
      voiceChannelName: queue.channel?.name
    };
  }

  private async getOrCreateQueue(guildId: string, channelId: string): Promise<GuildQueue> {
    let queue = this.player.nodes.get(guildId);
    if (queue?.channel?.id && queue.channel.id !== channelId) {
      queue.delete();
      queue = null;
    }

    if (!queue) {
      queue = this.player.nodes.create(guildId, {
        ...DEFAULT_QUEUE_OPTIONS,
        onBeforeCreateStream: async (track) => this.tryProvideSpotifyBridgeStream(track)
      });
    }

    if (!queue.connection) {
      try {
        await queue.connect(channelId, {
          deaf: true
        });
      } catch (error) {
        queue.delete();

        this.logger.warn("music.queue.connect.failed", {
          guildId,
          channelId,
          errorCode: getErrorCode(error),
          errorMessage: getErrorMessage(error)
        });

        throw new ValidationError("No se pudo unir al canal de voz para reproducir musica.");
      }
    }

    return queue;
  }

  private async tryProvideSpotifyBridgeStream(track: Track): Promise<Readable | null> {
    if (track.source !== "spotify") {
      return null;
    }

    const cacheKey = track.url || `${track.title}:${track.author}`;
    const cachedYoutubeUrl = this.spotifyBridgeUrlCache.get(cacheKey);
    if (cachedYoutubeUrl) {
      try {
        return Downloader.download(cachedYoutubeUrl);
      } catch {
        this.spotifyBridgeUrlCache.delete(cacheKey);
      }
    }

    const fallbackQuery = `${track.title} ${track.author}`.trim();
    if (!fallbackQuery) {
      return null;
    }

    const youtubeUrl = await this.resolveYoutubeUrlFromSearch(fallbackQuery);
    if (!youtubeUrl) {
      this.logger.warn("music.playback.spotify-bridge.search-empty", {
        spotifyTrackTitle: track.title,
        spotifyTrackUrl: track.url,
        fallbackQuery
      });
      return null;
    }

    this.spotifyBridgeUrlCache.set(cacheKey, youtubeUrl);

    try {
      return Downloader.download(youtubeUrl);
    } catch (error) {
      this.spotifyBridgeUrlCache.delete(cacheKey);

      this.logger.warn("music.playback.spotify-bridge.download-failed", {
        spotifyTrackTitle: track.title,
        spotifyTrackUrl: track.url,
        youtubeUrl,
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error)
      });

      return null;
    }
  }

  private async resolveYoutubeUrlFromSearch(query: string): Promise<string | null> {
    try {
      const result = (await ytdl.default(`ytsearch1:${query}`, {
        dumpSingleJson: true,
        skipDownload: true,
        simulate: true,
        noWarnings: true,
        preferFreeFormats: true
      })) as YtDlpSearchResponse;

      const firstEntry = result.entries?.at(0);
      if (firstEntry?.webpage_url) {
        return firstEntry.webpage_url;
      }

      if (firstEntry?.id) {
        return toCanonicalYoutubeWatchUrl(firstEntry.id);
      }

      if (result.webpage_url?.includes("youtube.com/watch")) {
        return result.webpage_url;
      }

      if (result.id) {
        return toCanonicalYoutubeWatchUrl(result.id);
      }

      return null;
    } catch (error) {
      this.logger.warn("music.playback.spotify-bridge.search-failed", {
        query,
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error)
      });

      return null;
    }
  }

  private async trySpotifyYoutubeFallback(
    queue: GuildQueue,
    spotifyUrl: string,
    requestedByUserId: string
  ): Promise<Awaited<ReturnType<GuildQueue["play"]>> | null> {
    try {
      const spotifyResult = await this.player.search(spotifyUrl, {
        requestedBy: requestedByUserId,
        searchEngine: "auto",
        requestOptions: this.requestOptions
      });

      const spotifyTrack = spotifyResult.tracks.at(0);
      if (!spotifyTrack) {
        return null;
      }

      const fallbackQuery = `${spotifyTrack.title} ${spotifyTrack.author}`.trim();
      if (!fallbackQuery) {
        return null;
      }

      return await queue.play(fallbackQuery, {
        requestedBy: requestedByUserId,
        searchEngine: "youtubeSearch",
        requestOptions: this.requestOptions
      });
    } catch {
      return null;
    }
  }

  private async registerExtractors(): Promise<void> {
    try {
      await this.player.extractors.loadMulti(DefaultExtractors);

      this.logger.info("music.extractors.ready", {
        loadedExtractors: this.player.extractors.size
      });
      this.logger.info("music.dependencies.scan", {
        report: this.player.scanDeps()
      });
    } catch (error) {
      this.logger.error("music.extractors.load.failed", {
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error)
      });

      throw new Error("No se pudieron cargar los extractores oficiales de discord-player");
    }
  }

  private bindQueueEventHandlers(): void {
    if (process.env.NODE_ENV !== "production") {
      this.player.on("debug", (message) => console.log(`[Player] ${message}`));
      this.player.events.on("debug", (queue, message) =>
        console.log(`[${queue.guild.name}: ${queue.guild.id}] ${message}`)
      );
    }

    this.player.events.on("playerStart", (queue, track) => {
      this.logger.info("music.queue.player-start", {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name,
        trackTitle: track.title,
        trackUrl: track.url
      });
    });

    this.player.events.on("emptyQueue", (queue) => {
      this.logger.info("music.queue.empty", {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name
      });
    });

    this.player.events.on("emptyChannel", (queue) => {
      this.logger.info("music.queue.empty-channel", {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name
      });
    });

    this.player.events.on("disconnect", (queue) => {
      this.logger.info("music.queue.disconnect", {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name
      });
    });

    this.player.extractors.on("error", (_context, extractor, error) => {
      this.logger.error("music.extractor.error", {
        extractorIdentifier:
          "identifier" in extractor && typeof extractor.identifier === "string"
            ? extractor.identifier
            : extractor.constructor.name,
        errorCode: getErrorCode(error),
        errorMessage: getErrorMessage(error)
      });
    });

    this.player.events.on("error", (queue, error) => {
      this.logger.error("music.queue.error", {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name,
        ...getConnectionDiagnostics(queue),
        errorCode: getErrorCode(error),
        errorMessage: error.message
      });
    });

    this.player.events.on("playerError", (queue, error, track) => {
      const payload = {
        guildId: queue.guild.id,
        voiceChannelId: queue.channel?.id,
        voiceChannelName: queue.channel?.name,
        trackTitle: track.title,
        trackUrl: track.url,
        ...getConnectionDiagnostics(queue),
        errorCode: getErrorCode(error),
        errorMessage: error.message
      };

      if (isStreamExtractionError(error)) {
        this.logger.warn("music.queue.player-error.stream-unavailable", payload);
        return;
      }

      this.logger.error("music.queue.player-error", payload);
    });
  }
}

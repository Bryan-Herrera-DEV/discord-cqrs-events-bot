import type { MusicQueueSnapshot, MusicTrack } from "@contexts/music/domain/MusicTrack";

export interface EnqueueMusicTrackInput {
  guildId: string;
  query: string;
  requestedByUserId: string;
  requestedInChannelId: string;
}

export interface EnqueueMusicTrackResult {
  addedTrack: MusicTrack;
  startedPlayback: boolean;
  totalTracksInQueue: number;
  voiceChannelName?: string;
}

export interface SkipMusicTrackInput {
  guildId: string;
  requestedByUserId: string;
}

export interface SkipMusicTrackResult {
  skipped: boolean;
  previousTrack?: MusicTrack;
  nextTrack?: MusicTrack | null;
}

export interface ToggleMusicPauseResult {
  changed: boolean;
  paused: boolean;
  currentTrack?: MusicTrack;
}

export interface StopMusicResult {
  stopped: boolean;
  clearedTracks: number;
  previousTrack?: MusicTrack;
}

export interface MusicPlaybackPort {
  enqueue(input: EnqueueMusicTrackInput): Promise<EnqueueMusicTrackResult>;
  skip(input: SkipMusicTrackInput): Promise<SkipMusicTrackResult>;
  togglePause(guildId: string): Promise<ToggleMusicPauseResult>;
  stop(guildId: string): Promise<StopMusicResult>;
  getQueue(guildId: string): Promise<MusicQueueSnapshot>;
  handleVoiceStateUpdate(guildId: string): Promise<void>;
}

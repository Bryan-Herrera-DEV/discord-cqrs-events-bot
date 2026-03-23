export interface MusicTrack {
  title: string;
  url: string;
  durationSeconds: number;
  requestedByUserId: string;
}

export interface MusicQueueSnapshot {
  currentTrack: MusicTrack | null;
  queuedTracks: MusicTrack[];
  isPaused: boolean;
  voiceChannelId?: string;
  voiceChannelName?: string;
}

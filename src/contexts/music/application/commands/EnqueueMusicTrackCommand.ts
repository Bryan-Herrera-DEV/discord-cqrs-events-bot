import type { Command } from "@shared/application/CommandBus";
import type { EnqueueMusicTrackResult } from "@contexts/music/application/ports/MusicPlaybackPort";

export class EnqueueMusicTrackCommand implements Command<EnqueueMusicTrackResult> {
  public static readonly type = "music.enqueue";
  public readonly type = EnqueueMusicTrackCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      query: string;
      requestedByUserId: string;
      requestedInChannelId: string;
    }
  ) {}
}

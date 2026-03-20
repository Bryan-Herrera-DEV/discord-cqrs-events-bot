import type { Command } from "@shared/application/CommandBus";
import type { SkipMusicTrackResult } from "@contexts/music/application/ports/MusicPlaybackPort";

export class SkipMusicTrackCommand implements Command<SkipMusicTrackResult> {
  public static readonly type = "music.skip";
  public readonly type = SkipMusicTrackCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      requestedByUserId: string;
    }
  ) {}
}

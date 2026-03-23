import type { Command } from "@shared/application/CommandBus";
import type { ToggleMusicPauseResult } from "@contexts/music/application/ports/MusicPlaybackPort";

export class ToggleMusicPauseCommand implements Command<ToggleMusicPauseResult> {
  public static readonly type = "music.toggle-pause";
  public readonly type = ToggleMusicPauseCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      requestedByUserId: string;
    }
  ) {}
}

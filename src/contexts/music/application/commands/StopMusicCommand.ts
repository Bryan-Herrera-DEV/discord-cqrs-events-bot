import type { Command } from "@shared/application/CommandBus";
import type { StopMusicResult } from "@contexts/music/application/ports/MusicPlaybackPort";

export class StopMusicCommand implements Command<StopMusicResult> {
  public static readonly type = "music.stop";
  public readonly type = StopMusicCommand.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      requestedByUserId: string;
    }
  ) {}
}

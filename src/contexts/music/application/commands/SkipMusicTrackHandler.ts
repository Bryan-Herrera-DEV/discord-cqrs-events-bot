import type { CommandHandler } from "@shared/application/CommandBus";

import { SkipMusicTrackCommand } from "@contexts/music/application/commands/SkipMusicTrackCommand";
import type {
  MusicPlaybackPort,
  SkipMusicTrackResult
} from "@contexts/music/application/ports/MusicPlaybackPort";

export class SkipMusicTrackHandler implements CommandHandler<
  SkipMusicTrackCommand,
  SkipMusicTrackResult
> {
  public constructor(private readonly playback: MusicPlaybackPort) {}

  public async handle(command: SkipMusicTrackCommand): Promise<SkipMusicTrackResult> {
    return this.playback.skip(command.payload);
  }
}

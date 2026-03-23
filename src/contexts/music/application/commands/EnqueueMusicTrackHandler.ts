import type { CommandHandler } from "@shared/application/CommandBus";

import { EnqueueMusicTrackCommand } from "@contexts/music/application/commands/EnqueueMusicTrackCommand";
import type {
  EnqueueMusicTrackResult,
  MusicPlaybackPort
} from "@contexts/music/application/ports/MusicPlaybackPort";

export class EnqueueMusicTrackHandler implements CommandHandler<
  EnqueueMusicTrackCommand,
  EnqueueMusicTrackResult
> {
  public constructor(private readonly playback: MusicPlaybackPort) {}

  public async handle(command: EnqueueMusicTrackCommand): Promise<EnqueueMusicTrackResult> {
    return this.playback.enqueue(command.payload);
  }
}

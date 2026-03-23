import type { CommandHandler } from "@shared/application/CommandBus";

import { ToggleMusicPauseCommand } from "@contexts/music/application/commands/ToggleMusicPauseCommand";
import type {
  MusicPlaybackPort,
  ToggleMusicPauseResult
} from "@contexts/music/application/ports/MusicPlaybackPort";

export class ToggleMusicPauseHandler implements CommandHandler<
  ToggleMusicPauseCommand,
  ToggleMusicPauseResult
> {
  public constructor(private readonly playback: MusicPlaybackPort) {}

  public async handle(command: ToggleMusicPauseCommand): Promise<ToggleMusicPauseResult> {
    void command.payload.requestedByUserId;
    return this.playback.togglePause(command.payload.guildId);
  }
}

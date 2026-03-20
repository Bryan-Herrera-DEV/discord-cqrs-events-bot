import type { CommandHandler } from "@shared/application/CommandBus";

import { StopMusicCommand } from "@contexts/music/application/commands/StopMusicCommand";
import type {
  MusicPlaybackPort,
  StopMusicResult
} from "@contexts/music/application/ports/MusicPlaybackPort";

export class StopMusicHandler implements CommandHandler<StopMusicCommand, StopMusicResult> {
  public constructor(private readonly playback: MusicPlaybackPort) {}

  public async handle(command: StopMusicCommand): Promise<StopMusicResult> {
    void command.payload.requestedByUserId;
    return this.playback.stop(command.payload.guildId);
  }
}

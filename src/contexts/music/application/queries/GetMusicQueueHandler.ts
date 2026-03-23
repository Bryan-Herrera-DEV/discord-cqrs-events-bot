import type { QueryHandler } from "@shared/application/QueryBus";

import { GetMusicQueueQuery } from "@contexts/music/application/queries/GetMusicQueueQuery";
import type { MusicPlaybackPort } from "@contexts/music/application/ports/MusicPlaybackPort";
import type { MusicQueueSnapshot } from "@contexts/music/domain/MusicTrack";

export class GetMusicQueueHandler implements QueryHandler<GetMusicQueueQuery, MusicQueueSnapshot> {
  public constructor(private readonly playback: MusicPlaybackPort) {}

  public async handle(query: GetMusicQueueQuery): Promise<MusicQueueSnapshot> {
    return this.playback.getQueue(query.payload.guildId);
  }
}

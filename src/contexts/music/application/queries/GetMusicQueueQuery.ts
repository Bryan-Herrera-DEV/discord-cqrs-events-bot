import type { Query } from "@shared/application/QueryBus";
import type { MusicQueueSnapshot } from "@contexts/music/domain/MusicTrack";

export class GetMusicQueueQuery implements Query<MusicQueueSnapshot> {
  public static readonly type = "music.get-queue";
  public readonly type = GetMusicQueueQuery.type;

  public constructor(public readonly payload: { guildId: string }) {}
}

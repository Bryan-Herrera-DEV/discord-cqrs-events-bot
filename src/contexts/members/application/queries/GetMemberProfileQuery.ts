import type { Query } from "@shared/application/QueryBus";

import type { MemberProfile } from "@contexts/members/domain/MemberProfile";

export class GetMemberProfileQuery implements Query<MemberProfile | null> {
  public static readonly type = "members.get-profile";
  public readonly type = GetMemberProfileQuery.type;

  public constructor(public readonly payload: { guildId: string; userId: string }) {}
}

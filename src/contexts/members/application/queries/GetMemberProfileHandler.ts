import type { QueryHandler } from "@shared/application/QueryBus";

import type { MemberProfileRepository } from "@contexts/members/application/ports/MemberProfileRepository";
import type { MemberProfile } from "@contexts/members/domain/MemberProfile";
import { GetMemberProfileQuery } from "@contexts/members/application/queries/GetMemberProfileQuery";

export class GetMemberProfileHandler
  implements QueryHandler<GetMemberProfileQuery, MemberProfile | null>
{
  public constructor(private readonly repository: MemberProfileRepository) {}

  public async handle(query: GetMemberProfileQuery): Promise<MemberProfile | null> {
    return this.repository.findByGuildAndUser(query.payload.guildId, query.payload.userId);
  }
}

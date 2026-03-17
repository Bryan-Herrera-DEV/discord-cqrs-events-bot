import type { QueryHandler } from "@shared/application/QueryBus";

import type { ModerationActionRepository } from "@contexts/moderation/application/ports/ModerationActionRepository";
import type { ModerationCaseRepository } from "@contexts/moderation/application/ports/ModerationCaseRepository";
import {
  ViewModerationCaseQuery,
  type ModerationCaseView
} from "@contexts/moderation/application/queries/ViewModerationCaseQuery";

export class ViewModerationCaseHandler
  implements QueryHandler<ViewModerationCaseQuery, ModerationCaseView | null>
{
  public constructor(
    private readonly caseRepository: ModerationCaseRepository,
    private readonly actionRepository: ModerationActionRepository
  ) {}

  public async handle(query: ViewModerationCaseQuery): Promise<ModerationCaseView | null> {
    const caseRecord = await this.caseRepository.findByGuildAndCaseNumber(
      query.payload.guildId,
      query.payload.caseNumber
    );
    if (!caseRecord) {
      return null;
    }

    const actions = await this.actionRepository.findByGuildAndCaseNumber(
      query.payload.guildId,
      query.payload.caseNumber
    );
    return {
      case: caseRecord,
      actions
    };
  }
}

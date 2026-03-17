import type { Query } from "@shared/application/QueryBus";

import type { ModerationAction } from "@contexts/moderation/domain/ModerationAction";
import type { ModerationCase } from "@contexts/moderation/domain/ModerationCase";

export interface ModerationCaseView {
  case: ModerationCase;
  actions: ModerationAction[];
}

export class ViewModerationCaseQuery implements Query<ModerationCaseView | null> {
  public static readonly type = "moderation.case.view";
  public readonly type = ViewModerationCaseQuery.type;

  public constructor(
    public readonly payload: {
      guildId: string;
      caseNumber: number;
    }
  ) {}
}

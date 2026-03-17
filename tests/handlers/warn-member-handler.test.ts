import { describe, expect, it, vi } from "vitest";

import { InMemoryEventBus } from "@shared/application/EventBus";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";
import { WarnMemberCommand } from "@contexts/moderation/application/commands/WarnMemberCommand";
import { WarnMemberHandler } from "@contexts/moderation/application/commands/WarnMemberHandler";
import type { ModerationCaseRecorder } from "@contexts/moderation/application/services/ModerationCaseRecorder";

describe("WarnMemberHandler", () => {
  it("registra case y publica evento WarningIssued", async () => {
    const record = vi.fn().mockResolvedValue(42);
    const recorder = { record } as unknown as ModerationCaseRecorder;

    const eventBus = new InMemoryEventBus(new PinoLogger("silent"));
    const warningSpy = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe("WarningIssued", warningSpy);

    const handler = new WarnMemberHandler(recorder, eventBus);
    const result = await handler.handle(
      new WarnMemberCommand({
        guildId: "123456789012345678",
        moderatorUserId: "111111111111111111",
        targetUserId: "222222222222222222",
        reason: "Contenido ofensivo"
      })
    );

    expect(record).toHaveBeenCalledTimes(1);
    expect(result.caseNumber).toBe(42);
    expect(warningSpy).toHaveBeenCalledTimes(1);
  });
});

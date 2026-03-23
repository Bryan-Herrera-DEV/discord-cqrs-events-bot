import { describe, expect, it, vi } from "vitest";

import { InMemoryEventBus } from "@shared/application/EventBus";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";
import { RegisterMemberOnJoinCommand } from "@contexts/members/application/commands/RegisterMemberOnJoinCommand";
import { RegisterMemberOnJoinHandler } from "@contexts/members/application/commands/RegisterMemberOnJoinHandler";
import type { MemberProfileRepository } from "@contexts/members/application/ports/MemberProfileRepository";

describe("RegisterMemberOnJoinHandler", () => {
  it("guarda perfil y publica UserRegistered", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const repository: MemberProfileRepository = {
      init: vi.fn().mockResolvedValue(undefined),
      save,
      findByGuildAndUser: vi.fn().mockResolvedValue(null),
      markLeft: vi.fn().mockResolvedValue(undefined)
    };

    const logger = new PinoLogger("silent");
    const eventBus = new InMemoryEventBus(logger);

    const userRegisteredSpy = vi.fn().mockResolvedValue(undefined);
    eventBus.subscribe("UserRegistered", userRegisteredSpy);

    const handler = new RegisterMemberOnJoinHandler(repository, eventBus);
    await handler.handle(
      new RegisterMemberOnJoinCommand({
        guildId: "123456789012345678",
        userId: "987654321098765432",
        username: "tester",
        displayName: "Tester",
        isBot: false,
        joinedAt: new Date(),
        initialRoleIds: []
      })
    );

    expect(save).toHaveBeenCalledTimes(1);
    expect(userRegisteredSpy).toHaveBeenCalledTimes(1);
  });
});

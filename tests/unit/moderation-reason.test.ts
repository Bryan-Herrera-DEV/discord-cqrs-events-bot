import { describe, expect, it } from "vitest";

import { ModerationReason } from "@shared/domain/value-objects/ModerationReason";

describe("ModerationReason", () => {
  it("acepta razones válidas", () => {
    const reason = ModerationReason.create("Incumplimiento de normas");
    expect(reason.toString()).toBe("Incumplimiento de normas");
  });

  it("rechaza razones demasiado cortas", () => {
    expect(() => ModerationReason.create("x")).toThrow();
  });
});

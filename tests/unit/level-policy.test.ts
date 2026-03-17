import { describe, expect, it } from "vitest";

import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";

describe("LevelPolicy", () => {
  const policy = new LevelPolicy();

  it("calcula nivel 1 con xp inicial", () => {
    expect(policy.levelFromXp(0)).toBe(1);
    expect(policy.levelFromXp(119)).toBe(1);
  });

  it("incrementa el nivel cuando supera umbrales", () => {
    const level2Threshold = policy.xpRequiredForLevel(2);
    expect(policy.levelFromXp(level2Threshold)).toBe(2);
    expect(policy.levelFromXp(policy.xpRequiredForLevel(4))).toBe(4);
  });

  it("devuelve xp restante al siguiente nivel", () => {
    const xp = policy.xpRequiredForLevel(3) - 5;
    expect(policy.xpToNextLevel(xp)).toBe(5);
  });
});

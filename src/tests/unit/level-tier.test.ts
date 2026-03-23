import { describe, expect, it } from "vitest";

import {
  buildLevelTierLabel,
  formatLevelTierRange,
  resolveLevelTier
} from "@contexts/levels/domain/LevelTier";

describe("LevelTier", () => {
  it("asigna tiers por bloques de 10 niveles", () => {
    expect(resolveLevelTier(1).id).toBe("bronze");
    expect(resolveLevelTier(10).id).toBe("silver");
    expect(resolveLevelTier(20).id).toBe("sapphire");
    expect(resolveLevelTier(30).id).toBe("ruby");
  });

  it("usa tier dorado desde nivel 40", () => {
    expect(resolveLevelTier(40).id).toBe("gold");
    expect(resolveLevelTier(85).id).toBe("gold");
  });

  it("expone etiqueta y rango legible", () => {
    const goldTier = resolveLevelTier(40);
    expect(formatLevelTierRange(goldTier)).toBe("40+");
    expect(buildLevelTierLabel(40)).toBe("Dorado (40+)");
  });
});

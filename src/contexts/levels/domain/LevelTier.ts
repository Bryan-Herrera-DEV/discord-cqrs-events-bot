export type LevelTierId = "bronze" | "silver" | "sapphire" | "ruby" | "gold";

export interface LevelTier {
  id: LevelTierId;
  label: string;
  minLevel: number;
  maxLevel: number | null;
  accentColor: number;
  backgroundFrom: string;
  backgroundTo: string;
  glowColor: string;
}

const levelTiers: readonly [LevelTier, ...LevelTier[]] = [
  {
    id: "bronze",
    label: "Bronce",
    minLevel: 1,
    maxLevel: 9,
    accentColor: 0xb87333,
    backgroundFrom: "#1f1611",
    backgroundTo: "#5b3719",
    glowColor: "rgba(184,115,51,0.45)"
  },
  {
    id: "silver",
    label: "Plata",
    minLevel: 10,
    maxLevel: 19,
    accentColor: 0xc0c7d1,
    backgroundFrom: "#1a232d",
    backgroundTo: "#4a5566",
    glowColor: "rgba(192,199,209,0.45)"
  },
  {
    id: "sapphire",
    label: "Zafiro",
    minLevel: 20,
    maxLevel: 29,
    accentColor: 0x3b78ff,
    backgroundFrom: "#0f1f3f",
    backgroundTo: "#1f4f99",
    glowColor: "rgba(59,120,255,0.45)"
  },
  {
    id: "ruby",
    label: "Rubi",
    minLevel: 30,
    maxLevel: 39,
    accentColor: 0xd64545,
    backgroundFrom: "#331218",
    backgroundTo: "#8f2532",
    glowColor: "rgba(214,69,69,0.45)"
  },
  {
    id: "gold",
    label: "Dorado",
    minLevel: 40,
    maxLevel: null,
    accentColor: 0xd4af37,
    backgroundFrom: "#2e220b",
    backgroundTo: "#8c6c19",
    glowColor: "rgba(212,175,55,0.5)"
  }
];

const normalizeLevel = (level: number): number => {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.floor(level));
};

const inTierRange = (tier: LevelTier, level: number): boolean => {
  if (tier.maxLevel === null) {
    return level >= tier.minLevel;
  }

  return level >= tier.minLevel && level <= tier.maxLevel;
};

export const resolveLevelTier = (level: number): LevelTier => {
  const normalizedLevel = normalizeLevel(level);
  const resolved = levelTiers.find((tier) => inTierRange(tier, normalizedLevel));
  return resolved ?? levelTiers[0];
};

export const formatLevelTierRange = (tier: LevelTier): string =>
  tier.maxLevel === null ? `${tier.minLevel}+` : `${tier.minLevel}-${tier.maxLevel}`;

export const buildLevelTierLabel = (level: number): string => {
  const tier = resolveLevelTier(level);
  return `${tier.label} (${formatLevelTierRange(tier)})`;
};

export class LevelPolicy {
  public xpRequiredForLevel(level: number): number {
    if (level <= 1) {
      return 0;
    }
    return Math.floor(120 * Math.pow(level - 1, 1.45));
  }

  public levelFromXp(xp: number): number {
    let level = 1;
    while (this.xpRequiredForLevel(level + 1) <= xp) {
      level += 1;
    }
    return level;
  }

  public xpToNextLevel(currentXp: number): number {
    const level = this.levelFromXp(currentXp);
    const nextLevelXp = this.xpRequiredForLevel(level + 1);
    return Math.max(0, nextLevelXp - currentXp);
  }
}

export interface LevelUpAlertImageInput {
  displayName: string;
  avatarUrl?: string;
  previousLevel: number;
  newLevel: number;
  totalXp: number;
}

export interface LevelUpAlertGeneratorPort {
  generate(input: LevelUpAlertImageInput): Promise<Buffer>;
}

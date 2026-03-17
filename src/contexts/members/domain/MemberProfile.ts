export interface OnboardingState {
  stage: "joined" | "welcomed" | "completed";
  completedAt?: Date;
}

export interface MemberProfile {
  guildId: string;
  userId: string;
  username: string;
  globalName?: string;
  displayName: string;
  avatarUrl?: string;
  bot: boolean;
  initialRoleIds: string[];
  joinedAt: Date;
  lastSeenAt: Date;
  onboarding: OnboardingState;
  metadata: {
    source: "discord_gateway";
    locale?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

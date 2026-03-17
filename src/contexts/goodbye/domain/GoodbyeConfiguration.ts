export interface GoodbyeConfiguration {
  guildId: string;
  enabled: boolean;
  channelId?: string;
  template: string;
  accentColor: number;
  createdAt: Date;
  updatedAt: Date;
}

export const defaultGoodbyeConfiguration = (guildId: string): GoodbyeConfiguration => {
  const now = new Date();
  return {
    guildId,
    enabled: false,
    template: "{displayName} ha salido del servidor.",
    accentColor: 0x8f3a2f,
    createdAt: now,
    updatedAt: now
  };
};

export interface WelcomeBranding {
  accentColor: number;
  title: string;
}

export interface WelcomeConfiguration {
  guildId: string;
  enabled: boolean;
  channelId?: string;
  template: string;
  useImage: boolean;
  branding: WelcomeBranding;
  createdAt: Date;
  updatedAt: Date;
}

export const defaultWelcomeConfiguration = (guildId: string): WelcomeConfiguration => {
  const now = new Date();
  return {
    guildId,
    enabled: true,
    template: "Bienvenido/a {user} a la comunidad. Te damos la bienvenida, {displayName}.",
    useImage: true,
    branding: {
      accentColor: 0x2d7a46,
      title: "Bienvenido"
    },
    createdAt: now,
    updatedAt: now
  };
};

export interface FeatureFlags {
  moderationEnabled: boolean;
  levelingEnabled: boolean;
  levelUpAlertsEnabled: boolean;
  welcomeEnabled: boolean;
  goodbyeEnabled: boolean;
  rolesEnabled: boolean;
}

export interface GuildChannels {
  logsChannelId?: string;
  levelUpChannelId?: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  newsChannelId?: string;
  alertChannelId?: string;
  musicCommandChannelId?: string;
  administrationChannelIds?: string[];
  botCommandChannelIds?: string[];
}

export interface PermissionPolicies {
  adminRoleIds: string[];
  moderatorRoleIds: string[];
  roleManagerRoleIds: string[];
}

export interface GuildSettings {
  guildId: string;
  language: string;
  featureFlags: FeatureFlags;
  channels: GuildChannels;
  permissionPolicies: PermissionPolicies;
  moderationCaseSequence: number;
  createdAt: Date;
  updatedAt: Date;
}

export const defaultGuildSettings = (guildId: string): GuildSettings => {
  const now = new Date();
  return {
    guildId,
    language: "es-ES",
    featureFlags: {
      moderationEnabled: true,
      levelingEnabled: true,
      levelUpAlertsEnabled: true,
      welcomeEnabled: true,
      goodbyeEnabled: true,
      rolesEnabled: true
    },
    channels: {
      administrationChannelIds: [],
      botCommandChannelIds: []
    },
    permissionPolicies: {
      adminRoleIds: [],
      moderatorRoleIds: [],
      roleManagerRoleIds: []
    },
    moderationCaseSequence: 0,
    createdAt: now,
    updatedAt: now
  };
};

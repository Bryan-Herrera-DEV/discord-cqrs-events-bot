export interface FeatureFlags {
  moderationEnabled: boolean;
  levelingEnabled: boolean;
  welcomeEnabled: boolean;
  goodbyeEnabled: boolean;
  rolesEnabled: boolean;
}

export interface GuildChannels {
  logsChannelId?: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
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
      welcomeEnabled: true,
      goodbyeEnabled: true,
      rolesEnabled: true
    },
    channels: {},
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

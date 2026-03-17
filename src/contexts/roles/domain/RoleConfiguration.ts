export interface ReactionRoleConfiguration {
  messageId: string;
  roleId: string;
  emoji: string;
}

export interface RoleConfiguration {
  guildId: string;
  configurableRoleIds: string[];
  autoRoleIds: string[];
  reactionRoleConfigurations: ReactionRoleConfiguration[];
  updatedAt: Date;
  createdAt: Date;
}

export const defaultRoleConfiguration = (guildId: string): RoleConfiguration => {
  const now = new Date();
  return {
    guildId,
    configurableRoleIds: [],
    autoRoleIds: [],
    reactionRoleConfigurations: [],
    createdAt: now,
    updatedAt: now
  };
};

export interface RoleContextSnapshot {
  actorHighestRolePosition: number;
  targetHighestRolePosition: number;
  rolePosition: number;
  roleManagedByIntegration: boolean;
  botHighestRolePosition: number;
}

export interface RoleListItem {
  id: string;
  name: string;
  position: number;
}

export interface RoleManagementPort {
  getRoleContext(guildId: string, actorUserId: string, targetUserId: string, roleId: string): Promise<RoleContextSnapshot>;
  assignRole(guildId: string, targetUserId: string, roleId: string, reason: string): Promise<void>;
  removeRole(guildId: string, targetUserId: string, roleId: string, reason: string): Promise<void>;
  listRoles(guildId: string): Promise<RoleListItem[]>;
}

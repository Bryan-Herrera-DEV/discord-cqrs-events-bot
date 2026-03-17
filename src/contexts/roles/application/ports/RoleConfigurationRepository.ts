import type { RoleConfiguration } from "@contexts/roles/domain/RoleConfiguration";

export interface RoleConfigurationRepository {
  init(): Promise<void>;
  findByGuildId(guildId: string): Promise<RoleConfiguration | null>;
  upsert(configuration: RoleConfiguration): Promise<void>;
  removeRoleFromConfiguration(guildId: string, roleId: string): Promise<void>;
}

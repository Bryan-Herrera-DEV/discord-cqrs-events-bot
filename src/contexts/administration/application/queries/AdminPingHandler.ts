import type { QueryHandler } from "@shared/application/QueryBus";

import { AdminPingQuery, type AdminPingView } from "@contexts/administration/application/queries/AdminPingQuery";

export class AdminPingHandler implements QueryHandler<AdminPingQuery, AdminPingView> {
  public async handle(_query: AdminPingQuery): Promise<AdminPingView> {
    return {
      uptimeSeconds: Math.floor(process.uptime()),
      now: new Date().toISOString()
    };
  }
}

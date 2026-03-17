import type { Query } from "@shared/application/QueryBus";

export interface AdminPingView {
  uptimeSeconds: number;
  now: string;
}

export class AdminPingQuery implements Query<AdminPingView> {
  public static readonly type = "administration.ping";
  public readonly type = AdminPingQuery.type;

  public constructor(public readonly payload: Record<string, never> = {}) {}
}

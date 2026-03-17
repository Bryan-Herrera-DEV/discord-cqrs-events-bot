import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryEventBus } from "@shared/application/EventBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import type { MongoConnection } from "@shared/infrastructure/mongodb/MongoConnection";
import type { MetricsRegistry } from "@shared/infrastructure/observability/metrics";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";
import type { CommandIdempotencyStore } from "@shared/infrastructure/idempotency/CommandIdempotencyStore";
import type { RateLimiter } from "@shared/infrastructure/rate-limit/RateLimiter";

export interface AppContext {
  logger: Logger;
  commandBus: InMemoryCommandBus;
  queryBus: InMemoryQueryBus;
  eventBus: InMemoryEventBus;
  mongo: MongoConnection;
  metrics: MetricsRegistry;
  discord: DiscordGateway;
  idempotencyStore: CommandIdempotencyStore;
  rateLimiter: RateLimiter;
}

import { createServer, type Server } from "node:http";

import type { DiscordGateway } from "@platform/discord/DiscordGateway";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import type { MongoConnection } from "@shared/infrastructure/mongodb/MongoConnection";
import type { MetricsRegistry } from "@shared/infrastructure/observability/metrics";

export class HealthServer {
  private server?: Server;

  public constructor(
    private readonly port: number,
    private readonly mongo: MongoConnection,
    private readonly discord: DiscordGateway,
    private readonly metrics: MetricsRegistry,
    private readonly logger: Logger
  ) {}

  public start(): void {
    this.server = createServer(async (req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end("Bad Request");
        return;
      }

      if (req.url === "/healthz") {
        const mongoHealthy = await this.mongo.ping();
        const discordReady = this.discord.isReady();
        const body = JSON.stringify({
          status: mongoHealthy ? "ok" : "degraded",
          mongo: mongoHealthy,
          discord: discordReady,
          uptimeSeconds: process.uptime()
        });
        res.setHeader("Content-Type", "application/json");
        res.end(body);
        return;
      }

      if (req.url === "/readyz") {
        const mongoHealthy = await this.mongo.ping();
        const ready = mongoHealthy && this.discord.isReady();
        res.statusCode = ready ? 200 : 503;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ready }));
        return;
      }

      if (req.url === "/metrics") {
        res.setHeader("Content-Type", this.metrics.registry.contentType);
        res.end(await this.metrics.registry.metrics());
        return;
      }

      res.statusCode = 404;
      res.end("Not Found");
    });

    this.server.listen(this.port, () => {
      this.logger.info("health.server.started", { port: this.port });
    });
  }

  public stop(): void {
    this.server?.close();
  }
}

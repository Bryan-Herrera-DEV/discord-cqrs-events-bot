import { Counter, Gauge, Registry, collectDefaultMetrics } from "prom-client";

export class MetricsRegistry {
  public readonly registry: Registry;
  public readonly commandCounter: Counter;
  public readonly commandFailureCounter: Counter;
  public readonly eventCounter: Counter;
  public readonly activeGuildsGauge: Gauge;

  public constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.commandCounter = new Counter({
      name: "bot_commands_total",
      help: "Total de comandos ejecutados",
      labelNames: ["command"],
      registers: [this.registry]
    });

    this.commandFailureCounter = new Counter({
      name: "bot_command_failures_total",
      help: "Total de fallos en comandos",
      labelNames: ["command", "code"],
      registers: [this.registry]
    });

    this.eventCounter = new Counter({
      name: "bot_events_total",
      help: "Total de eventos internos publicados",
      labelNames: ["event"],
      registers: [this.registry]
    });

    this.activeGuildsGauge = new Gauge({
      name: "bot_active_guilds",
      help: "Guilds activas actualmente",
      registers: [this.registry]
    });
  }
}

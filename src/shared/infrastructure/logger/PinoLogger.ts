import pino, { type Logger as PinoBaseLogger } from "pino";

import type { Logger } from "@shared/infrastructure/logger/Logger";

export class PinoLogger implements Logger {
  private readonly logger: PinoBaseLogger;

  public constructor(level: string, bindings?: Record<string, unknown>, logger?: PinoBaseLogger) {
    this.logger =
      logger ??
      pino({
        level,
        base: bindings,
        timestamp: pino.stdTimeFunctions.isoTime
      });
  }

  public debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(data ?? {}, message);
  }

  public info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(data ?? {}, message);
  }

  public warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(data ?? {}, message);
  }

  public error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(data ?? {}, message);
  }

  public child(bindings: Record<string, unknown>): Logger {
    return new PinoLogger(this.logger.level, undefined, this.logger.child(bindings));
  }
}

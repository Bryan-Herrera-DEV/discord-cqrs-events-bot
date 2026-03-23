import pino, { type DestinationStream, type Logger as PinoBaseLogger } from "pino";

import type { Logger } from "@shared/infrastructure/logger/Logger";

const shouldPrettyPrint = (): boolean => {
  if (process.env.LOG_PRETTY === "true") {
    return true;
  }

  if (process.env.LOG_PRETTY === "false") {
    return false;
  }

  return process.env.NODE_ENV === "development" && process.stdout.isTTY;
};

const createDestination = (): DestinationStream | undefined => {
  if (!shouldPrettyPrint()) {
    return undefined;
  }

  return pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      singleLine: true,
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
      ignore: "pid,hostname"
    }
  });
};

export class PinoLogger implements Logger {
  private readonly logger: PinoBaseLogger;

  public constructor(level: string, bindings?: Record<string, unknown>, logger?: PinoBaseLogger) {
    this.logger =
      logger ??
      pino(
        {
          level,
          base: bindings,
          timestamp: pino.stdTimeFunctions.isoTime
        },
        createDestination()
      );
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

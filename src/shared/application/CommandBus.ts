import type { Logger } from "@shared/infrastructure/logger/Logger";

export interface Command<TResult = unknown> {
  readonly type: string;
  readonly commandId?: string;
  readonly metadata?: Record<string, string>;
  readonly payload: unknown;
  readonly expectedResult?: TResult;
}

export interface CommandHandler<TCommand extends Command<TResult>, TResult = unknown> {
  handle(command: TCommand): Promise<TResult>;
}

export class InMemoryCommandBus {
  private readonly handlers = new Map<string, CommandHandler<Command, unknown>>();

  public constructor(private readonly logger: Logger) {}

  public register<TCommand extends Command<TResult>, TResult>(
    commandType: string,
    handler: CommandHandler<TCommand, TResult>
  ): void {
    this.handlers.set(commandType, handler as CommandHandler<Command, unknown>);
  }

  public async execute<TResult>(command: Command<TResult>): Promise<TResult> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No existe handler para command: ${command.type}`);
    }

    this.logger.debug("command.dispatch", {
      commandType: command.type,
      commandId: command.commandId
    });

    return (await handler.handle(command as Command<unknown>)) as TResult;
  }
}

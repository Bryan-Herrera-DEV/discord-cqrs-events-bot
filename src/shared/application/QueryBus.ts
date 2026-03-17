import type { Logger } from "@shared/infrastructure/logger/Logger";

export interface Query<TResult = unknown> {
  readonly type: string;
  readonly payload: unknown;
  readonly expectedResult?: TResult;
}

export interface QueryHandler<TQuery extends Query<TResult>, TResult = unknown> {
  handle(query: TQuery): Promise<TResult>;
}

export class InMemoryQueryBus {
  private readonly handlers = new Map<string, QueryHandler<Query<unknown>, unknown>>();

  public constructor(private readonly logger: Logger) {}

  public register<TQuery extends Query<TResult>, TResult>(
    queryType: string,
    handler: QueryHandler<TQuery, TResult>
  ): void {
    this.handlers.set(queryType, handler as QueryHandler<Query<unknown>, unknown>);
  }

  public async execute<TResult>(query: Query<TResult>): Promise<TResult> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No existe handler para query: ${query.type}`);
    }

    this.logger.debug("query.dispatch", {
      queryType: query.type
    });

    return (await handler.handle(query as Query<unknown>)) as TResult;
  }
}

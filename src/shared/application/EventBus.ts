import type { DomainEvent } from "@shared/domain/DomainEvent";
import type { Logger } from "@shared/infrastructure/logger/Logger";

export type DomainEventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent
) => Promise<void>;

export class InMemoryEventBus {
  private readonly handlers = new Map<string, DomainEventHandler[]>();

  public constructor(
    private readonly logger: Logger,
    private readonly maxRetries = 2,
    private readonly onPublished?: (event: DomainEvent) => Promise<void>
  ) {}

  public subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: DomainEventHandler<TEvent>
  ): void {
    const existing = this.handlers.get(eventName) ?? [];
    existing.push(handler as DomainEventHandler);
    this.handlers.set(eventName, existing);
  }

  public async publish<TEvent extends DomainEvent>(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.name) ?? [];

    if (handlers.length === 0) {
      return;
    }

    this.logger.debug("event.publish", {
      eventName: event.name,
      eventId: event.id,
      handlers: handlers.length
    });

    if (this.onPublished) {
      await this.onPublished(event);
    }

    await Promise.all(
      handlers.map(async (handler) => {
        let attempts = 0;
        let done = false;

        while (!done && attempts <= this.maxRetries) {
          attempts += 1;
          try {
            await handler(event);
            done = true;
          } catch (error) {
            this.logger.error("event.handler.failed", {
              eventName: event.name,
              eventId: event.id,
              attempts,
              error
            });
            if (attempts > this.maxRetries) {
              throw error;
            }
          }
        }
      })
    );
  }
}

export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: TPayload;
  readonly metadata?: Record<string, string>;
}

export const createEventId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

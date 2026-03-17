export type IdempotencyBeginResult = "started" | "already_processed" | "in_progress";

export interface CommandIdempotencyStore {
  begin(key: string, ttlSeconds: number, commandName: string): Promise<IdempotencyBeginResult>;
  complete(key: string): Promise<void>;
  fail(key: string, reason: string): Promise<void>;
}

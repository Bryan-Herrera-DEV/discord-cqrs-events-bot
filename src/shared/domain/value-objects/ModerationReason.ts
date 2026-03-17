import { z } from "zod";

const moderationReasonSchema = z
  .string()
  .min(3, "La razón debe tener al menos 3 caracteres")
  .max(500, "La razón no puede exceder 500 caracteres")
  .transform((value) => value.trim());

export class ModerationReason {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static create(value: string): ModerationReason {
    return new ModerationReason(moderationReasonSchema.parse(value));
  }

  public toString(): string {
    return this.value;
  }
}

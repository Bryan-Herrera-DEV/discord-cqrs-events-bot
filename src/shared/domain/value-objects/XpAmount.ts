import { z } from "zod";

const xpSchema = z.number().int().min(0);

export class XpAmount {
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  public static create(value: number): XpAmount {
    return new XpAmount(xpSchema.parse(value));
  }

  public add(amount: number): XpAmount {
    return XpAmount.create(this.value + amount);
  }
}

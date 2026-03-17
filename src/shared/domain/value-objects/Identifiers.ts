import { z } from "zod";

const snowflakeSchema = z.string().regex(/^\d{17,20}$/);

class BaseIdentifier {
  public readonly value: string;

  protected constructor(value: string) {
    this.value = value;
  }

  public toString(): string {
    return this.value;
  }
}

export class GuildId extends BaseIdentifier {
  public static create(value: string): GuildId {
    return new GuildId(snowflakeSchema.parse(value));
  }
}

export class UserId extends BaseIdentifier {
  public static create(value: string): UserId {
    return new UserId(snowflakeSchema.parse(value));
  }
}

export class ChannelId extends BaseIdentifier {
  public static create(value: string): ChannelId {
    return new ChannelId(snowflakeSchema.parse(value));
  }
}

export class RoleId extends BaseIdentifier {
  public static create(value: string): RoleId {
    return new RoleId(snowflakeSchema.parse(value));
  }
}

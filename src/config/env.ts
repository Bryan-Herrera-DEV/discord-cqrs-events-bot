import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN es requerido"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID es requerido"),
  DISCORD_GUILD_ID: z.string().optional(),
  MONGO_URI: z.string().min(1, "MONGO_URI es requerido"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  HEALTH_PORT: z.coerce.number().int().positive().default(3001),
  XP_MIN_GAIN: z.coerce.number().int().positive().default(10),
  XP_MAX_GAIN: z.coerce.number().int().positive().default(20),
  XP_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(45),
  VOICE_XP_PER_MINUTE: z.coerce.number().int().nonnegative().default(2),
  VOICE_XP_MAX_MINUTES_PER_SESSION: z.coerce.number().int().positive().default(180),
  COMMAND_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
  IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(600)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Variables de entorno inválidas:\n${issues.join("\n")}`);
}

export const env = parsed.data;

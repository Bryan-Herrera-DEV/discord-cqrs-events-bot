import { REST, Routes } from "discord.js";

import { env } from "@config/env";
import { createModules } from "@/modules";
import { InMemoryCommandBus } from "@shared/application/CommandBus";
import { InMemoryEventBus } from "@shared/application/EventBus";
import { InMemoryQueryBus } from "@shared/application/QueryBus";
import { PinoLogger } from "@shared/infrastructure/logger/PinoLogger";
import { MongoConnection } from "@shared/infrastructure/mongodb/MongoConnection";
import { MetricsRegistry } from "@shared/infrastructure/observability/metrics";
import { HealthServer } from "@shared/infrastructure/health/HealthServer";
import { DiscordGateway } from "@platform/discord/DiscordGateway";
import { InteractionRouter } from "@platform/discord/InteractionRouter";
import { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";
import { MongoCommandIdempotencyStore } from "@shared/infrastructure/idempotency/MongoCommandIdempotencyStore";
import { InMemoryRateLimiter } from "@shared/infrastructure/rate-limit/InMemoryRateLimiter";
import { MongoEventOutboxRepository } from "@shared/infrastructure/outbox/MongoEventOutboxRepository";
import { BotEvents } from "@shared/domain/events/BotEvents";
import { createEventId } from "@shared/domain/DomainEvent";
import {
  AdminSlashCommandHandler,
  LevelSlashCommandHandler,
  ModerationSlashCommandHandler,
  RoleSlashCommandHandler
} from "@platform/discord/handlers";
import { GrantMessageXpCommand } from "@contexts/levels/application/commands/GrantMessageXpCommand";
import { GrantVoiceXpCommand } from "@contexts/levels/application/commands/GrantVoiceXpCommand";
import { InitializeLevelProfileCommand } from "@contexts/levels/application/commands/InitializeLevelProfileCommand";
import { MarkGuildRemovedCommand } from "@contexts/guilds/application/commands/MarkGuildRemovedCommand";
import { RegisterGuildCommand } from "@contexts/guilds/application/commands/RegisterGuildCommand";

const parseDbName = (mongoUri: string): string => {
  try {
    const url = new URL(mongoUri);
    const pathname = url.pathname.replace("/", "").trim();
    return pathname || "discord-bot";
  } catch {
    return "discord-bot";
  }
};

export interface RunningApp {
  stop(): Promise<void>;
}

export const buildSlashCommandPayload = (): ReturnType<SlashCommandRegistry["getAll"]> => {
  const registry = new SlashCommandRegistry();
  for (const module of createModules()) {
    module.registerSlashCommands(registry);
  }
  return registry.getAll();
};

export const registerSlashCommands = async (): Promise<void> => {
  const logger = new PinoLogger(env.LOG_LEVEL, { scope: "slash-command-register" });
  const commands = buildSlashCommandPayload();
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  if (env.DISCORD_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
      body: commands
    });
    logger.info("discord.commands.registered.guild", {
      commandCount: commands.length,
      guildId: env.DISCORD_GUILD_ID
    });
    return;
  }

  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: commands
  });
  logger.info("discord.commands.registered.global", { commandCount: commands.length });
};

export const startApp = async (): Promise<RunningApp> => {
  const logger = new PinoLogger(env.LOG_LEVEL, { service: "discord-bot" });
  const metrics = new MetricsRegistry();

  const mongo = new MongoConnection(
    env.MONGO_URI,
    parseDbName(env.MONGO_URI),
    logger.child({ layer: "mongo" })
  );
  await mongo.connect();

  const outbox = new MongoEventOutboxRepository(mongo.getDatabase());
  await outbox.init();

  const eventBus = new InMemoryEventBus(logger.child({ layer: "event-bus" }), 2, async (event) => {
    metrics.eventCounter.inc({ event: event.name });
    await outbox.append(event);
  });

  const commandBus = new InMemoryCommandBus(logger.child({ layer: "command-bus" }));
  const queryBus = new InMemoryQueryBus(logger.child({ layer: "query-bus" }));
  const discord = new DiscordGateway(logger.child({ layer: "discord" }));

  const idempotencyStore = new MongoCommandIdempotencyStore(mongo.getDatabase());
  await idempotencyStore.init();

  const rateLimiter = new InMemoryRateLimiter(env.COMMAND_RATE_LIMIT_PER_MINUTE, 60_000);

  const context = {
    logger,
    commandBus,
    queryBus,
    eventBus,
    mongo,
    metrics,
    discord,
    idempotencyStore,
    rateLimiter
  };

  for (const module of createModules()) {
    await module.register(context);
    logger.info("module.registered", { module: module.name });
  }

  const interactionRouter = new InteractionRouter(
    [
      new AdminSlashCommandHandler(commandBus, queryBus, discord),
      new RoleSlashCommandHandler(commandBus, queryBus, discord),
      new LevelSlashCommandHandler(queryBus),
      new ModerationSlashCommandHandler(commandBus, queryBus, discord)
    ],
    logger.child({ layer: "interaction-router" }),
    metrics,
    idempotencyStore,
    rateLimiter,
    env.IDEMPOTENCY_TTL_SECONDS
  );

  discord.onReady(async () => {
    logger.info("discord.ready", { guilds: discord.guildCount() });
    metrics.activeGuildsGauge.set(discord.guildCount());
  });

  discord.onInteractionCreate(async (interaction) => {
    await interactionRouter.handle(interaction);
  });

  const voiceSessionStartedAt = new Map<string, number>();
  const toVoiceSessionKey = (guildId: string, userId: string): string => `${guildId}:${userId}`;

  discord.onGuildMemberAdd(async (member) => {
    await eventBus.publish(
      BotEvents.guildMemberJoined({
        guildId: member.guild.id,
        userId: member.user.id,
        username: member.user.username,
        globalName: member.user.globalName ?? undefined,
        displayName: member.displayName,
        avatarUrl: member.displayAvatarURL({ extension: "png", forceStatic: false }),
        isBot: member.user.bot,
        joinedAt: member.joinedAt ?? new Date(),
        initialRoleIds: [...member.roles.cache.keys()]
      })
    );
  });

  discord.onGuildMemberRemove(async (member) => {
    await eventBus.publish(
      BotEvents.guildMemberLeft({
        guildId: member.guild.id,
        userId: member.user.id,
        username: member.user.username,
        globalName: member.user.globalName ?? undefined,
        displayName: member.displayName,
        avatarUrl: member.displayAvatarURL({ extension: "png", forceStatic: false }),
        leftAt: new Date()
      })
    );
  });

  discord.onGuildCreate(async (guildId) => {
    await commandBus.execute(
      new RegisterGuildCommand({
        guildId,
        name: await discord.getGuildName(guildId)
      })
    );

    const memberIds = await discord.listGuildMemberIds(guildId);
    const batchSize = 100;
    for (let start = 0; start < memberIds.length; start += batchSize) {
      const batch = memberIds.slice(start, start + batchSize);
      await Promise.all(
        batch.map(async (userId) => {
          await commandBus.execute(new InitializeLevelProfileCommand({ guildId, userId }));
        })
      );
    }

    logger.info("guild.levels.seeded", {
      guildId,
      profilesCreatedOrVerified: memberIds.length
    });
  });

  discord.onGuildDelete(async (guildId) => {
    for (const key of voiceSessionStartedAt.keys()) {
      if (key.startsWith(`${guildId}:`)) {
        voiceSessionStartedAt.delete(key);
      }
    }
    await commandBus.execute(new MarkGuildRemovedCommand({ guildId }));
  });

  discord.onRoleCreate(async (_guildId, _roleId) => {
    void _guildId;
    void _roleId;
  });

  discord.onRoleDelete(async (guildId, roleId) => {
    await eventBus.publish({
      id: createEventId(),
      name: "RoleDeleted",
      occurredAt: new Date(),
      payload: { guildId, roleId }
    });
  });

  discord.onMessageCreate(async (message) => {
    if (!message.guildId || message.author.bot) {
      return;
    }
    await commandBus.execute(
      new GrantMessageXpCommand({
        guildId: message.guildId,
        userId: message.author.id,
        minXpGain: env.XP_MIN_GAIN,
        maxXpGain: env.XP_MAX_GAIN,
        cooldownSeconds: env.XP_COOLDOWN_SECONDS
      })
    );
  });

  discord.onVoiceStateUpdate(async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) {
      return;
    }

    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) {
      return;
    }

    const guildId = member.guild.id;
    const userId = member.user.id;
    const key = toVoiceSessionKey(guildId, userId);

    if (!oldState.channelId && newState.channelId) {
      voiceSessionStartedAt.set(key, Date.now());
      return;
    }

    if (oldState.channelId && !newState.channelId) {
      const startedAt = voiceSessionStartedAt.get(key);
      voiceSessionStartedAt.delete(key);
      if (!startedAt) {
        return;
      }

      const minutes = Math.floor((Date.now() - startedAt) / 60_000);
      if (minutes <= 0) {
        return;
      }

      await commandBus.execute(
        new GrantVoiceXpCommand({
          guildId,
          userId,
          minutes,
          xpPerMinute: env.VOICE_XP_PER_MINUTE,
          maxMinutesPerSession: env.VOICE_XP_MAX_MINUTES_PER_SESSION
        })
      );
      return;
    }

    if (oldState.channelId && newState.channelId && !voiceSessionStartedAt.has(key)) {
      voiceSessionStartedAt.set(key, Date.now());
    }
  });

  const healthServer = new HealthServer(env.HEALTH_PORT, mongo, discord, metrics, logger);
  healthServer.start();

  await discord.start(env.DISCORD_TOKEN);

  const onUnhandledError = (error: unknown): void => {
    logger.error("process.unhandled", {
      error: error instanceof Error ? error.message : String(error)
    });
  };
  process.on("unhandledRejection", onUnhandledError);
  process.on("uncaughtException", onUnhandledError);

  return {
    stop: async (): Promise<void> => {
      healthServer.stop();
      await mongo.disconnect();
    }
  };
};

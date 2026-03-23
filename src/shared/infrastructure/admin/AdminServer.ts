import { timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { z } from "zod";

import { UpsertGuildSettingsCommand } from "@contexts/guild-settings/application/commands/UpsertGuildSettingsCommand";
import { GetGuildSettingsQuery } from "@contexts/guild-settings/application/queries/GetGuildSettingsQuery";
import type { GuildChannels, GuildSettings } from "@contexts/guild-settings/domain/GuildSettings";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";
import type { InMemoryCommandBus } from "@shared/application/CommandBus";
import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { Logger } from "@shared/infrastructure/logger/Logger";
import { renderAdminDashboardPage } from "@shared/infrastructure/admin/AdminDashboardPage";

const guildIdSchema = z.string().regex(/^\d+$/u, "guildId invalido");
const channelIdSchema = z.string().regex(/^\d+$/u, "channelId invalido");
const nullableChannelIdSchema = z.union([channelIdSchema, z.null()]);

const updateSettingsSchema = z
  .object({
    language: z.string().min(2).max(10).optional(),
    featureFlags: z
      .object({
        moderationEnabled: z.boolean().optional(),
        levelingEnabled: z.boolean().optional(),
        levelUpAlertsEnabled: z.boolean().optional(),
        welcomeEnabled: z.boolean().optional(),
        goodbyeEnabled: z.boolean().optional(),
        rolesEnabled: z.boolean().optional()
      })
      .strict()
      .optional(),
    channels: z
      .object({
        logsChannelId: nullableChannelIdSchema.optional(),
        levelUpChannelId: nullableChannelIdSchema.optional(),
        welcomeChannelId: nullableChannelIdSchema.optional(),
        goodbyeChannelId: nullableChannelIdSchema.optional(),
        newsChannelId: nullableChannelIdSchema.optional(),
        alertChannelId: nullableChannelIdSchema.optional(),
        musicCommandChannelId: nullableChannelIdSchema.optional(),
        administrationChannelIds: z.array(channelIdSchema).max(25).optional(),
        botCommandChannelIds: z.array(channelIdSchema).max(25).optional()
      })
      .strict()
      .optional()
  })
  .strict();

type UpdateSettingsPayload = z.infer<typeof updateSettingsSchema>;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const hasAnyChanges = (payload: {
  language?: string;
  featureFlags?: UpdateSettingsPayload["featureFlags"];
  channels?: GuildChannels;
}): boolean => {
  if (payload.language) {
    return true;
  }
  if (payload.featureFlags && Object.keys(payload.featureFlags).length > 0) {
    return true;
  }
  if (payload.channels && Object.keys(payload.channels).length > 0) {
    return true;
  }
  return false;
};

export class AdminServer {
  private server?: Server;

  public constructor(
    private readonly port: number,
    private readonly queryBus: InMemoryQueryBus,
    private readonly commandBus: InMemoryCommandBus,
    private readonly discord: DiscordGateway,
    private readonly logger: Logger,
    private readonly adminApiToken?: string
  ) {}

  public start(): void {
    this.server = createServer(async (req, res) => {
      try {
        await this.handleRequest(req, res);
      } catch (error) {
        this.logger.error("admin.server.request.failed", {
          error: error instanceof Error ? error.message : String(error),
          method: req.method,
          url: req.url
        });
        this.sendJson(res, 500, { error: "Error interno en servidor admin" });
      }
    });

    this.server.listen(this.port, () => {
      this.logger.info("admin.server.started", {
        port: this.port,
        authEnabled: Boolean(this.adminApiToken)
      });
    });
  }

  public stop(): void {
    this.server?.close();
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!req.url) {
      this.sendJson(res, 400, { error: "Bad Request" });
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const { pathname } = url;

    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(renderAdminDashboardPage());
      return;
    }

    if (req.method === "GET" && pathname === "/healthz") {
      this.sendJson(res, 200, {
        status: "ok",
        discordReady: this.discord.isReady(),
        uptimeSeconds: process.uptime()
      });
      return;
    }

    if (!pathname.startsWith("/api/")) {
      this.sendJson(res, 404, { error: "Not Found" });
      return;
    }

    if (!this.isAuthorized(req)) {
      this.sendJson(res, 401, { error: "No autorizado" });
      return;
    }

    await this.handleApiRequest(req, res, pathname);
  }

  private async handleApiRequest(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string
  ): Promise<void> {
    if (req.method === "GET" && pathname === "/api/guilds") {
      if (!this.discord.isReady()) {
        this.sendJson(res, 200, {
          ready: false,
          guilds: []
        });
        return;
      }

      const guilds = await this.discord.listGuilds();
      this.sendJson(res, 200, {
        ready: true,
        guilds
      });
      return;
    }

    const guildChannelsMatch = /^\/api\/guilds\/([^/]+)\/channels$/u.exec(pathname);
    if (req.method === "GET" && guildChannelsMatch) {
      if (!this.discord.isReady()) {
        this.sendJson(res, 503, { error: "El bot todavia no esta listo en Discord" });
        return;
      }

      const guildId = this.parseGuildId(guildChannelsMatch[1], res);
      if (!guildId) {
        return;
      }

      const channels = await this.discord.listConfigurableChannels(guildId);
      this.sendJson(res, 200, { guildId, channels });
      return;
    }

    const guildSettingsMatch = /^\/api\/guilds\/([^/]+)\/settings$/u.exec(pathname);
    if (guildSettingsMatch) {
      const guildId = this.parseGuildId(guildSettingsMatch[1], res);
      if (!guildId) {
        return;
      }

      if (req.method === "GET") {
        const settings = await this.queryBus.execute<GuildSettings>(
          new GetGuildSettingsQuery({ guildId })
        );
        this.sendJson(res, 200, { guildId, settings });
        return;
      }

      if (req.method === "PUT") {
        await this.handleSettingsUpdate(req, res, guildId);
        return;
      }
    }

    this.sendJson(res, 404, { error: "Ruta API no encontrada" });
  }

  private parseGuildId(input: string | undefined, res: ServerResponse): string | null {
    const parsed = guildIdSchema.safeParse(input);
    if (!parsed.success) {
      this.sendJson(res, 400, { error: parsed.error.issues[0]?.message ?? "guildId invalido" });
      return null;
    }
    return parsed.data;
  }

  private normalizeChannelsPatch(
    channels: UpdateSettingsPayload["channels"]
  ): GuildChannels | undefined {
    if (!channels) {
      return undefined;
    }

    const patch: GuildChannels = {};

    if (hasOwn(channels, "logsChannelId")) {
      patch.logsChannelId = channels.logsChannelId ?? undefined;
    }
    if (hasOwn(channels, "levelUpChannelId")) {
      patch.levelUpChannelId = channels.levelUpChannelId ?? undefined;
    }
    if (hasOwn(channels, "welcomeChannelId")) {
      patch.welcomeChannelId = channels.welcomeChannelId ?? undefined;
    }
    if (hasOwn(channels, "goodbyeChannelId")) {
      patch.goodbyeChannelId = channels.goodbyeChannelId ?? undefined;
    }
    if (hasOwn(channels, "newsChannelId")) {
      patch.newsChannelId = channels.newsChannelId ?? undefined;
    }
    if (hasOwn(channels, "alertChannelId")) {
      patch.alertChannelId = channels.alertChannelId ?? undefined;
    }
    if (hasOwn(channels, "musicCommandChannelId")) {
      patch.musicCommandChannelId = channels.musicCommandChannelId ?? undefined;
    }
    if (hasOwn(channels, "administrationChannelIds")) {
      patch.administrationChannelIds = channels.administrationChannelIds ?? [];
    }
    if (hasOwn(channels, "botCommandChannelIds")) {
      patch.botCommandChannelIds = channels.botCommandChannelIds ?? [];
    }

    return Object.keys(patch).length > 0 ? patch : undefined;
  }

  private async findInvalidChannelIds(guildId: string, patch: GuildChannels): Promise<string[]> {
    if (!this.discord.isReady()) {
      return [];
    }

    const availableChannels = await this.discord.listConfigurableChannels(guildId);
    const availableChannelIds = new Set(availableChannels.map((channel) => channel.id));
    const requestedChannelIds = new Set<string>();

    if (patch.logsChannelId) {
      requestedChannelIds.add(patch.logsChannelId);
    }
    if (patch.levelUpChannelId) {
      requestedChannelIds.add(patch.levelUpChannelId);
    }
    if (patch.welcomeChannelId) {
      requestedChannelIds.add(patch.welcomeChannelId);
    }
    if (patch.goodbyeChannelId) {
      requestedChannelIds.add(patch.goodbyeChannelId);
    }
    if (patch.newsChannelId) {
      requestedChannelIds.add(patch.newsChannelId);
    }
    if (patch.alertChannelId) {
      requestedChannelIds.add(patch.alertChannelId);
    }
    if (patch.musicCommandChannelId) {
      requestedChannelIds.add(patch.musicCommandChannelId);
    }
    for (const channelId of patch.administrationChannelIds ?? []) {
      requestedChannelIds.add(channelId);
    }
    for (const channelId of patch.botCommandChannelIds ?? []) {
      requestedChannelIds.add(channelId);
    }

    return [...requestedChannelIds].filter((channelId) => !availableChannelIds.has(channelId));
  }

  private async handleSettingsUpdate(
    req: IncomingMessage,
    res: ServerResponse,
    guildId: string
  ): Promise<void> {
    let requestBody: unknown;
    try {
      requestBody = await this.readJsonBody(req);
    } catch (error) {
      this.sendJson(res, 400, {
        error: error instanceof Error ? error.message : "Payload invalido"
      });
      return;
    }

    const parsed = updateSettingsSchema.safeParse(requestBody);
    if (!parsed.success) {
      this.sendJson(res, 400, {
        error: "Payload invalido",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    const channels = this.normalizeChannelsPatch(parsed.data.channels);
    if (channels) {
      const invalidChannelIds = await this.findInvalidChannelIds(guildId, channels);
      if (invalidChannelIds.length > 0) {
        this.sendJson(res, 400, {
          error: "Se enviaron canales que no existen en la guild",
          invalidChannelIds
        });
        return;
      }
    }

    const featureFlags =
      parsed.data.featureFlags && Object.keys(parsed.data.featureFlags).length > 0
        ? parsed.data.featureFlags
        : undefined;

    if (!hasAnyChanges({ language: parsed.data.language, featureFlags, channels })) {
      this.sendJson(res, 400, { error: "No se enviaron cambios para actualizar" });
      return;
    }

    await this.commandBus.execute(
      new UpsertGuildSettingsCommand({
        guildId,
        changedBy: this.resolveChangedBy(req),
        language: parsed.data.language,
        featureFlags,
        channels
      })
    );

    const settings = await this.queryBus.execute<GuildSettings>(
      new GetGuildSettingsQuery({ guildId })
    );
    this.sendJson(res, 200, {
      ok: true,
      guildId,
      settings
    });
  }

  private async readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    const maxSize = 512_000;

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalSize += buffer.byteLength;
      if (totalSize > maxSize) {
        throw new Error("Payload demasiado grande");
      }
      chunks.push(buffer);
    }

    if (chunks.length === 0) {
      return {};
    }

    const body = Buffer.concat(chunks).toString("utf8").trim();
    if (!body) {
      return {};
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new Error("JSON invalido");
    }
  }

  private resolveChangedBy(req: IncomingMessage): string {
    const headerValue = req.headers["x-admin-user-id"];
    if (typeof headerValue === "string" && headerValue.trim().length > 0) {
      return headerValue.trim();
    }
    return "admin-panel";
  }

  private isAuthorized(req: IncomingMessage): boolean {
    if (!this.adminApiToken) {
      return true;
    }

    const bearerToken = this.extractBearerToken(req.headers.authorization);
    if (!bearerToken) {
      return false;
    }

    return this.safeEquals(bearerToken, this.adminApiToken);
  }

  private extractBearerToken(authorizationHeader: string | undefined): string | null {
    if (!authorizationHeader) {
      return null;
    }

    if (!authorizationHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  private safeEquals(a: string, b: string): boolean {
    const left = Buffer.from(a);
    const right = Buffer.from(b);

    if (left.length !== right.length) {
      return false;
    }

    return timingSafeEqual(left, right);
  }

  private sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
    if (res.writableEnded) {
      return;
    }

    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
  }
}

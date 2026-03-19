import {
  ChannelType,
  Client,
  GatewayIntentBits,
  GuildMember,
  Partials,
  type ChatInputCommandInteraction,
  type Interaction,
  type Message,
  type MessageCreateOptions,
  type Snowflake,
  type VoiceState
} from "discord.js";

import type { Logger } from "@shared/infrastructure/logger/Logger";

export class DiscordGateway {
  private readonly client: Client;

  public constructor(private readonly logger: Logger) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ],
      partials: [Partials.Channel, Partials.GuildMember, Partials.User, Partials.Message]
    });
  }

  public onReady(handler: () => Promise<void>): void {
    this.client.on("clientReady", () => {
      void handler();
    });
  }

  public onInteractionCreate(
    handler: (interaction: ChatInputCommandInteraction) => Promise<void>
  ): void {
    this.client.on("interactionCreate", (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }
      void handler(interaction);
    });
  }

  public onGuildMemberAdd(handler: (member: GuildMember) => Promise<void>): void {
    this.client.on("guildMemberAdd", (member) => {
      void handler(member);
    });
  }

  public onGuildMemberRemove(handler: (member: GuildMember) => Promise<void>): void {
    this.client.on("guildMemberRemove", (member) => {
      if (member instanceof GuildMember) {
        void handler(member);
      }
    });
  }

  public onGuildCreate(handler: (guildId: string) => Promise<void>): void {
    this.client.on("guildCreate", (guild) => {
      void handler(guild.id);
    });
  }

  public onGuildDelete(handler: (guildId: string) => Promise<void>): void {
    this.client.on("guildDelete", (guild) => {
      void handler(guild.id);
    });
  }

  public onMessageCreate(handler: (message: Message) => Promise<void>): void {
    this.client.on("messageCreate", (message) => {
      void handler(message);
    });
  }

  public onVoiceStateUpdate(
    handler: (oldState: VoiceState, newState: VoiceState) => Promise<void>
  ): void {
    this.client.on("voiceStateUpdate", (oldState, newState) => {
      void handler(oldState, newState);
    });
  }

  public onRoleCreate(handler: (guildId: string, roleId: string) => Promise<void>): void {
    this.client.on("roleCreate", (role) => {
      void handler(role.guild.id, role.id);
    });
  }

  public onRoleDelete(handler: (guildId: string, roleId: string) => Promise<void>): void {
    this.client.on("roleDelete", (role) => {
      void handler(role.guild.id, role.id);
    });
  }

  public async start(token: string): Promise<void> {
    await this.client.login(token);
    this.logger.info("discord.login.ok");
  }

  public isReady(): boolean {
    return this.client.isReady();
  }

  public guildCount(): number {
    return this.client.guilds.cache.size;
  }

  public async sendMessage(channelId: Snowflake, payload: MessageCreateOptions): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error(`Canal no textual o no encontrado: ${channelId}`);
    }
    await (channel as { send: (options: MessageCreateOptions) => Promise<unknown> }).send(payload);
  }

  public async addRoleToMember(
    guildId: string,
    memberId: string,
    roleId: string,
    reason: string
  ): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);
    await member.roles.add(roleId, reason);
  }

  public async removeRoleFromMember(
    guildId: string,
    memberId: string,
    roleId: string,
    reason: string
  ): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);
    await member.roles.remove(roleId, reason);
  }

  public async listRoles(
    guildId: string
  ): Promise<{ id: string; name: string; position: number }[]> {
    const guild = await this.client.guilds.fetch(guildId);
    const roles = await guild.roles.fetch();
    return roles
      .filter((role) => role !== null)
      .map((role) => ({ id: role.id, name: role.name, position: role.position }))
      .sort((a, b) => b.position - a.position);
  }

  public async getMemberHierarchy(
    guildId: string,
    userId: string
  ): Promise<{ highestRolePosition: number }> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return {
      highestRolePosition: member.roles.highest.position
    };
  }

  public async getRoleHierarchy(
    guildId: string,
    roleId: string
  ): Promise<{ position: number; managed: boolean }> {
    const guild = await this.client.guilds.fetch(guildId);
    const role = await guild.roles.fetch(roleId);
    if (!role) {
      throw new Error("Rol no encontrado");
    }
    return {
      position: role.position,
      managed: role.managed
    };
  }

  public async getBotHighestRolePosition(guildId: string): Promise<number> {
    const guild = await this.client.guilds.fetch(guildId);
    const me = await guild.members.fetchMe();
    return me.roles.highest.position;
  }

  public async getMemberRoleIds(guildId: string, userId: string): Promise<string[]> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return [...member.roles.cache.keys()];
  }

  public async getMemberProfile(
    guildId: string,
    userId: string
  ): Promise<{ displayName: string; username: string; avatarUrl?: string }> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);
    return {
      displayName: member.displayName,
      username: member.user.username,
      avatarUrl: member.displayAvatarURL({ extension: "png", forceStatic: false, size: 256 })
    };
  }

  public async getGuildName(guildId: string): Promise<string> {
    const guild = await this.client.guilds.fetch(guildId);
    return guild.name;
  }

  public async listGuilds(): Promise<{ id: string; name: string }[]> {
    if (this.client.isReady()) {
      return [...this.client.guilds.cache.values()]
        .map((guild) => ({ id: guild.id, name: guild.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const guilds = await this.client.guilds.fetch();
    return [...guilds.values()]
      .map((guild) => ({ id: guild.id, name: guild.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public async listConfigurableChannels(guildId: string): Promise<
    {
      id: string;
      name: string;
      category?: string;
      kind: "text" | "announcement";
      position: number;
    }[]
  > {
    const guild = await this.client.guilds.fetch(guildId);
    const channels = await guild.channels.fetch();

    const configurableChannels: {
      id: string;
      name: string;
      category?: string;
      kind: "text" | "announcement";
      position: number;
    }[] = [];

    for (const channel of channels.values()) {
      if (!channel) {
        continue;
      }

      if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
      ) {
        continue;
      }

      configurableChannels.push({
        id: channel.id,
        name: channel.name,
        category: channel.parent?.name ?? undefined,
        kind: channel.type === ChannelType.GuildAnnouncement ? "announcement" : "text",
        position: channel.rawPosition
      });
    }

    return configurableChannels.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.name.localeCompare(b.name);
    });
  }

  public async getDefaultAnnouncementChannelId(guildId: string): Promise<string | null> {
    const guild = await this.client.guilds.fetch(guildId);

    if (guild.systemChannelId) {
      return guild.systemChannelId;
    }

    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      if (!channel) {
        continue;
      }
      if (channel.isTextBased() && "send" in channel) {
        return channel.id;
      }
    }

    return null;
  }

  public async listGuildMemberIds(guildId: string, includeBots = false): Promise<string[]> {
    const guild = await this.client.guilds.fetch(guildId);
    const members = await guild.members.fetch();
    return members
      .filter((member) => includeBots || !member.user.bot)
      .map((member) => member.user.id);
  }

  public async listVoiceChannelMemberIds(
    guildId: string,
    channelId: string,
    includeBots = false
  ): Promise<string[]> {
    const guild = await this.client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isVoiceBased() || !("members" in channel)) {
      return [];
    }

    return [...channel.members.values()]
      .filter((member) => includeBots || !member.user.bot)
      .map((member) => member.user.id);
  }

  public async kickMember(guildId: string, memberId: string, reason: string): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);
    await member.kick(reason);
  }

  public async banMember(
    guildId: string,
    memberId: string,
    reason: string,
    deleteMessageSeconds = 0
  ): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    await guild.members.ban(memberId, {
      reason,
      deleteMessageSeconds
    });
  }

  public async unbanMember(guildId: string, memberId: string, reason: string): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    await guild.bans.remove(memberId, reason);
  }

  public async timeoutMember(
    guildId: string,
    memberId: string,
    durationMs: number,
    reason: string
  ): Promise<void> {
    const guild = await this.client.guilds.fetch(guildId);
    const member = await guild.members.fetch(memberId);
    await member.timeout(durationMs, reason);
  }

  public async purgeMessages(
    guildId: string,
    channelId: string,
    amount: number,
    reason: string
  ): Promise<number> {
    const guild = await this.client.guilds.fetch(guildId);
    const channel = await guild.channels.fetch(channelId);
    if (!channel?.isTextBased() || !("bulkDelete" in channel)) {
      throw new Error("El canal no soporta purge de mensajes");
    }
    const deleted = await channel.bulkDelete(amount, true);
    this.logger.info("mod.purge.executed", {
      guildId,
      channelId,
      amount,
      reason,
      deleted: deleted.size
    });
    return deleted.size;
  }
}

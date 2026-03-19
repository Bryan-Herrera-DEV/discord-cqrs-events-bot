import { EmbedBuilder } from "discord.js";

import type { GuildSettingsRepository } from "@contexts/guild-settings/application/ports/GuildSettingsRepository";
import type { ModerationExecutionPort } from "@contexts/moderation/application/ports/ModerationExecutionPort";
import type { ModerationActionType } from "@contexts/moderation/domain/ModerationCase";
import type { DiscordGateway } from "@platform/discord/DiscordGateway";

const titleByAction: Record<ModerationActionType, string> = {
  warn: "Advertencia",
  kick: "Kick",
  ban: "Ban",
  unban: "Unban",
  timeout: "Timeout",
  purge: "Purge",
  softban: "Softban"
};

export class DiscordModerationAdapter implements ModerationExecutionPort {
  public constructor(
    private readonly discord: DiscordGateway,
    private readonly guildSettingsRepository: GuildSettingsRepository
  ) {}

  public async kick(guildId: string, targetUserId: string, reason: string): Promise<void> {
    await this.discord.kickMember(guildId, targetUserId, reason);
  }

  public async ban(guildId: string, targetUserId: string, reason: string): Promise<void> {
    await this.discord.banMember(guildId, targetUserId, reason);
  }

  public async unban(guildId: string, targetUserId: string, reason: string): Promise<void> {
    await this.discord.unbanMember(guildId, targetUserId, reason);
  }

  public async timeout(
    guildId: string,
    targetUserId: string,
    durationMs: number,
    reason: string
  ): Promise<void> {
    await this.discord.timeoutMember(guildId, targetUserId, durationMs, reason);
  }

  public async purge(
    guildId: string,
    channelId: string,
    amount: number,
    reason: string
  ): Promise<number> {
    return this.discord.purgeMessages(guildId, channelId, amount, reason);
  }

  public async logToModerationChannel(input: {
    guildId: string;
    actionType: ModerationActionType;
    caseNumber: number;
    moderatorUserId: string;
    targetUserId?: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const settings = await this.guildSettingsRepository.findByGuildId(input.guildId);
    const channelId = settings?.channels.logsChannelId ?? settings?.channels.alertChannelId;
    if (!channelId) {
      return;
    }

    const details: string[] = [
      `Caso #${input.caseNumber}`,
      `Moderador: <@${input.moderatorUserId}>`,
      input.targetUserId ? `Objetivo: <@${input.targetUserId}>` : "Objetivo: N/A",
      `Razón: ${input.reason}`
    ];
    if (input.metadata) {
      details.push(`Metadata: ${JSON.stringify(input.metadata)}`);
    }

    await this.discord.sendMessage(channelId, {
      embeds: [
        new EmbedBuilder()
          .setTitle(`${titleByAction[input.actionType]} ejecutado`)
          .setColor(0xb33939)
          .setDescription(details.join("\n"))
          .setTimestamp(new Date())
      ]
    });
  }
}

import { EmbedBuilder } from "discord.js";

type EmbedTone = "success" | "info" | "warning" | "danger";

const toneColors: Record<EmbedTone, number> = {
  success: 0x2d7a46,
  info: 0x1f4d78,
  warning: 0xe67e22,
  danger: 0xb33939
};

export const buildMessageEmbed = (
  tone: EmbedTone,
  title: string,
  description: string
): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(toneColors[tone])
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();

export const successEmbed = (title: string, description: string): EmbedBuilder =>
  buildMessageEmbed("success", title, description);

export const infoEmbed = (title: string, description: string): EmbedBuilder =>
  buildMessageEmbed("info", title, description);

export const warningEmbed = (title: string, description: string): EmbedBuilder =>
  buildMessageEmbed("warning", title, description);

export const dangerEmbed = (title: string, description: string): EmbedBuilder =>
  buildMessageEmbed("danger", title, description);

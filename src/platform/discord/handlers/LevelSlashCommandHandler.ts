import { AttachmentBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";

import { GetMyLevelQuery } from "@contexts/levels/application/queries/GetMyLevelQuery";
import { GetLevelLeaderboardQuery } from "@contexts/levels/application/queries/GetLevelLeaderboardQuery";
import type { MyLevelView } from "@contexts/levels/application/queries/GetMyLevelQuery";
import type { LeaderboardEntry } from "@contexts/levels/application/ports/LevelProfileRepository";
import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
import { buildLevelTierLabel, resolveLevelTier } from "@contexts/levels/domain/LevelTier";
import { NapiCanvasLevelCardGenerator } from "@contexts/levels/infrastructure/image/NapiCanvasLevelCardGenerator";
import { infoEmbed } from "@platform/discord/MessageEmbeds";

export class LevelSlashCommandHandler implements SlashCommandHandler {
  public readonly commandName = "level";
  private readonly levelPolicy = new LevelPolicy();
  private readonly levelCardGenerator = new NapiCanvasLevelCardGenerator();

  public constructor(private readonly queryBus: InMemoryQueryBus) {}

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guildId as string;

    if (subcommand === "me") {
      const user = interaction.options.getUser("user") ?? interaction.user;
      const result = await this.queryBus.execute<MyLevelView | null>(
        new GetMyLevelQuery({
          guildId,
          userId: user.id
        })
      );

      if (!result) {
        await interaction.reply({
          ephemeral: true,
          embeds: [
            infoEmbed(
              "Sin perfil de nivel",
              "Este usuario aún no tiene perfil de nivel registrado."
            )
          ]
        });
        return;
      }

      const currentLevelBaseXp = this.levelPolicy.xpRequiredForLevel(result.level);
      const nextLevelBaseXp = this.levelPolicy.xpRequiredForLevel(result.level + 1);
      const xpIntoLevel = Math.max(0, result.xp - currentLevelBaseXp);
      const xpNeededInLevel = Math.max(1, nextLevelBaseXp - currentLevelBaseXp);
      const tier = resolveLevelTier(result.level);
      const tierLabel = buildLevelTierLabel(result.level);

      try {
        const image = await this.levelCardGenerator.generate({
          displayName: user.globalName ?? user.username,
          avatarUrl: user.displayAvatarURL({ extension: "png", forceStatic: false, size: 256 }),
          level: result.level,
          rank: result.rank,
          totalXp: result.xp,
          xpIntoLevel,
          xpNeededInLevel,
          totalMessages: result.totalMessages
        });
        const attachment = new AttachmentBuilder(image, { name: "level-card.png" });

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(tier.accentColor)
              .setTitle(`Nivel de ${user.username}`)
              .setDescription(
                [
                  `Nivel actual: ${result.level}`,
                  `Tier actual: ${tierLabel}`,
                  `Rank global: ${result.rank ?? "N/A"}`,
                  `XP para siguiente nivel: ${result.xpToNextLevel}`
                ].join("\n")
              )
              .setImage("attachment://level-card.png")
          ],
          files: [attachment]
        });
        return;
      } catch {
        // fallback a embed simple si falla la generacion de imagen
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(tier.accentColor)
            .setTitle(`Nivel de ${user.username}`)
            .setDescription(
              [
                `Nivel: ${result.level}`,
                `Tier: ${tierLabel}`,
                `XP: ${result.xp}`,
                `XP a siguiente nivel: ${result.xpToNextLevel}`,
                `Rango: ${result.rank ?? "N/A"}`,
                `Mensajes contados: ${result.totalMessages}`
              ].join("\n")
            )
        ]
      });
      return;
    }

    if (subcommand === "leaderboard") {
      const limit = interaction.options.getInteger("limit") ?? 10;
      const leaderboard = await this.queryBus.execute<LeaderboardEntry[]>(
        new GetLevelLeaderboardQuery({
          guildId,
          limit
        })
      );

      if (leaderboard.length === 0) {
        await interaction.reply({
          embeds: [
            infoEmbed(
              "Leaderboard de niveles",
              "Aún no hay datos para mostrar. Envía mensajes o participa en voz para ganar XP."
            )
          ]
        });
        return;
      }

      const topThree = leaderboard
        .slice(0, 3)
        .map((entry, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
          return `${medal} <@${entry.userId}> · Nivel ${entry.level} · ${entry.xp} XP`;
        })
        .join("\n");

      const lines = leaderboard.map((entry, index) => {
        const position = `${index + 1}.`.padStart(3, " ");
        return `${position} <@${entry.userId}> · Nivel ${entry.level} · ${entry.xp} XP`;
      });

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1f4d78)
            .setTitle("Leaderboard de niveles")
            .setDescription("Ranking actual de actividad y experiencia del servidor.")
            .addFields(
              {
                name: "Top 3",
                value: topThree
              },
              {
                name: `Top ${leaderboard.length}`,
                value: lines.join("\n")
              }
            )
            .setFooter({ text: `Solicitado por ${interaction.user.username} · Límite ${limit}` })
            .setTimestamp()
        ]
      });
    }
  }
}

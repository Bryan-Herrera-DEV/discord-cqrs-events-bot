import { AttachmentBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

import type { InMemoryQueryBus } from "@shared/application/QueryBus";
import type { SlashCommandHandler } from "@platform/discord/InteractionRouter";

import { GetMyLevelQuery } from "@contexts/levels/application/queries/GetMyLevelQuery";
import { GetLevelLeaderboardQuery } from "@contexts/levels/application/queries/GetLevelLeaderboardQuery";
import type { MyLevelView } from "@contexts/levels/application/queries/GetMyLevelQuery";
import type { LeaderboardEntry } from "@contexts/levels/application/ports/LevelProfileRepository";
import { LevelPolicy } from "@contexts/levels/domain/LevelPolicy";
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
              .setColor(0x2d7a46)
              .setTitle(`Nivel de ${user.username}`)
              .setDescription(
                [
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
            .setColor(0x2d7a46)
            .setTitle(`Nivel de ${user.username}`)
            .setDescription(
              [
                `Nivel: ${result.level}`,
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

      const lines = leaderboard.map((entry, index) => {
        const badge =
          index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
        return `${badge} <@${entry.userId}> - Nivel ${entry.level} (${entry.xp} XP)`;
      });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1f4d78)
            .setTitle("Leaderboard de niveles")
            .setDescription(lines.length > 0 ? lines.join("\n") : "Sin datos aun")
        ]
      });
    }
  }
}

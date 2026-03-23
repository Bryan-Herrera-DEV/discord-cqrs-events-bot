import { formatLevelTierRange, resolveLevelTier } from "@contexts/levels/domain/LevelTier";

export interface LevelCardInput {
  displayName: string;
  avatarUrl?: string;
  level: number;
  rank: number | null;
  totalXp: number;
  xpIntoLevel: number;
  xpNeededInLevel: number;
  totalMessages: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toHexColor = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;

export class NapiCanvasLevelCardGenerator {
  public async generate(input: LevelCardInput): Promise<Buffer> {
    const canvasModule = await import("@napi-rs/canvas");
    const { createCanvas, loadImage } = canvasModule;

    const width = 1100;
    const height = 340;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    const tier = resolveLevelTier(input.level);
    const tierRange = formatLevelTierRange(tier);
    const accentHex = toHexColor(tier.accentColor);

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, tier.backgroundFrom);
    background.addColorStop(1, tier.backgroundTo);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * 0.82, 70, 12, width * 0.82, 70, 280);
    glow.addColorStop(0, tier.glowColor);
    glow.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255,255,255,0.06)";
    context.beginPath();
    context.arc(width - 100, 70, 180, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f2f6f7";
    context.font = "bold 44px Sans";
    context.fillText("Perfil de nivel", 290, 84);

    context.font = "34px Sans";
    context.fillText(input.displayName, 290, 136);

    context.font = "26px Sans";
    context.fillStyle = accentHex;
    context.fillText(`Tier ${tier.label} (${tierRange})`, 290, 174);

    context.font = "28px Sans";
    context.fillStyle = "#c8eef0";
    const rankLabel = input.rank ? `#${input.rank}` : "N/A";
    context.fillText(`Nivel ${input.level}  |  Rank ${rankLabel}`, 290, 210);

    context.fillText(`XP total: ${input.totalXp}`, 290, 244);
    context.fillText(`Mensajes: ${input.totalMessages}`, 290, 274);

    const progressX = 290;
    const progressY = 292;
    const progressWidth = 740;
    const progressHeight = 22;
    const ratio = clamp(input.xpIntoLevel / Math.max(1, input.xpNeededInLevel), 0, 1);

    context.fillStyle = "rgba(255,255,255,0.2)";
    context.fillRect(progressX, progressY, progressWidth, progressHeight);

    const progressGradient = context.createLinearGradient(
      progressX,
      progressY,
      progressX + progressWidth,
      progressY
    );
    progressGradient.addColorStop(0, accentHex);
    progressGradient.addColorStop(1, "rgba(255,255,255,0.85)");
    context.fillStyle = progressGradient;
    context.fillRect(progressX, progressY, progressWidth * ratio, progressHeight);

    context.font = "22px Sans";
    context.fillStyle = "#f2f6f7";
    context.fillText(
      `Progreso: ${input.xpIntoLevel}/${input.xpNeededInLevel} XP`,
      progressX,
      progressY - 10
    );

    context.strokeStyle = accentHex;
    context.lineWidth = 6;
    context.beginPath();
    context.arc(145, 170, 112, 0, Math.PI * 2);
    context.stroke();

    if (input.avatarUrl) {
      try {
        const avatar = await loadImage(input.avatarUrl);
        const avatarSize = 210;
        context.save();
        context.beginPath();
        context.arc(145, 170, avatarSize / 2, 0, Math.PI * 2);
        context.closePath();
        context.clip();
        context.drawImage(avatar, 40, 65, avatarSize, avatarSize);
        context.restore();
      } catch {
        context.fillStyle = "rgba(255,255,255,0.15)";
        context.beginPath();
        context.arc(145, 170, 105, 0, Math.PI * 2);
        context.fill();
      }
    }

    return canvas.toBuffer("image/png");
  }
}

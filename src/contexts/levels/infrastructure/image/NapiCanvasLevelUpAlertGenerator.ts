import type {
  LevelUpAlertGeneratorPort,
  LevelUpAlertImageInput
} from "@contexts/levels/application/ports/LevelUpAlertGeneratorPort";
import { buildLevelTierLabel, resolveLevelTier } from "@contexts/levels/domain/LevelTier";

const toHexColor = (value: number): string => `#${value.toString(16).padStart(6, "0")}`;

const hexToRgba = (hexColor: string, alpha: number): string => {
  const hex = hexColor.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const drawRoundedRect = (
  context: {
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    arcTo: (x1: number, y1: number, x2: number, y2: number, radius: number) => void;
    closePath: () => void;
  },
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
};

const truncateToWidth = (
  context: { measureText: (text: string) => { width: number } },
  value: string,
  maxWidth: number
): string => {
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let result = value;
  while (result.length > 1 && context.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }

  return `${result}...`;
};

const initialsFromName = (displayName: string): string => {
  const parts = displayName
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  if (parts.length > 0) {
    return parts.join("");
  }

  return displayName.slice(0, 2).toUpperCase() || "??";
};

const trimOrFallback = (value: string, fallback: string): string => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export class NapiCanvasLevelUpAlertGenerator implements LevelUpAlertGeneratorPort {
  public async generate(input: LevelUpAlertImageInput): Promise<Buffer> {
    const canvasModule = await import("@napi-rs/canvas");
    const { createCanvas, loadImage } = canvasModule;

    const width = 1200;
    const height = 420;
    const tier = resolveLevelTier(input.newLevel);
    const accentHex = toHexColor(tier.accentColor);
    const tierLabel = buildLevelTierLabel(input.newLevel);

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, tier.backgroundFrom);
    background.addColorStop(1, tier.backgroundTo);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * 0.78, 82, 10, width * 0.78, 82, 320);
    glow.addColorStop(0, tier.glowColor);
    glow.addColorStop(1, hexToRgba(accentHex, 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255,255,255,0.08)";
    context.beginPath();
    context.arc(width - 130, 74, 176, 0, Math.PI * 2);
    context.fill();

    drawRoundedRect(context, 306, 54, 850, 312, 30);
    context.fillStyle = "rgba(10, 12, 16, 0.38)";
    context.fill();
    context.strokeStyle = hexToRgba(accentHex, 0.5);
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#f7f8fa";
    context.font = "700 56px Sans";
    context.fillText("Subida de nivel", 348, 138);

    const displayName = trimOrFallback(input.displayName, "Miembro");
    context.fillStyle = "#ffffff";
    context.font = "700 50px Sans";
    context.fillText(truncateToWidth(context, displayName, 760), 348, 210);

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "700 31px Sans";
    context.fillText(`Nivel ${input.previousLevel} -> ${input.newLevel}`, 348, 266);

    context.fillStyle = accentHex;
    context.font = "700 29px Sans";
    context.fillText(`Tier ${tierLabel}`, 348, 316);

    context.fillStyle = "rgba(255,255,255,0.85)";
    context.font = "700 27px Sans";
    context.fillText(`XP total: ${input.totalXp}`, 348, 356);

    const avatarX = 68;
    const avatarY = 100;
    const avatarSize = 220;

    const ringGradient = context.createLinearGradient(
      avatarX,
      avatarY,
      avatarX + avatarSize,
      avatarY + avatarSize
    );
    ringGradient.addColorStop(0, "rgba(255,255,255,0.9)");
    ringGradient.addColorStop(1, accentHex);

    context.beginPath();
    context.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2 + 10,
      0,
      Math.PI * 2
    );
    context.strokeStyle = ringGradient;
    context.lineWidth = 8;
    context.stroke();

    let avatarLoaded = false;
    if (input.avatarUrl) {
      try {
        const avatar = await loadImage(input.avatarUrl);
        context.save();
        context.beginPath();
        context.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2,
          0,
          Math.PI * 2
        );
        context.closePath();
        context.clip();
        context.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        context.restore();
        avatarLoaded = true;
      } catch {
        avatarLoaded = false;
      }
    }

    if (!avatarLoaded) {
      const placeholderGradient = context.createLinearGradient(
        avatarX,
        avatarY,
        avatarX + avatarSize,
        avatarY + avatarSize
      );
      placeholderGradient.addColorStop(0, hexToRgba(accentHex, 0.9));
      placeholderGradient.addColorStop(1, "rgba(255,255,255,0.25)");

      context.beginPath();
      context.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      context.fillStyle = placeholderGradient;
      context.fill();

      context.fillStyle = "rgba(255,255,255,0.95)";
      context.font = "700 74px Sans";
      const initials = initialsFromName(displayName);
      const initialsWidth = context.measureText(initials).width;
      context.fillText(initials, avatarX + (avatarSize - initialsWidth) / 2, avatarY + 138);
    }

    context.fillStyle = hexToRgba(accentHex, 0.95);
    context.fillRect(0, height - 14, width, 14);

    return canvas.toBuffer("image/png");
  }
}

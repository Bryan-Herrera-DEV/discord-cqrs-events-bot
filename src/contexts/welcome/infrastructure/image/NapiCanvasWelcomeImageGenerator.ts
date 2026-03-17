import type {
  WelcomeImageGeneratorPort,
  WelcomeImageInput
} from "@contexts/welcome/application/ports/WelcomeImageGeneratorPort";

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

const trimAndFallback = (value: string | undefined, fallback: string): string => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : fallback;
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

export class NapiCanvasWelcomeImageGenerator implements WelcomeImageGeneratorPort {
  public async generate(input: WelcomeImageInput): Promise<Buffer> {
    const canvasModule = await import("@napi-rs/canvas");
    const { createCanvas, loadImage } = canvasModule;

    const width = 1200;
    const height = 420;
    const variant = input.variant ?? "welcome";
    const accentHex = toHexColor(
      input.accentColor ?? (variant === "goodbye" ? 0x8f3a2f : 0x2d7a46)
    );
    const backgroundStart = variant === "goodbye" ? "#2a1418" : "#102b2a";
    const backgroundEnd = variant === "goodbye" ? "#451f24" : "#1b4332";

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, backgroundStart);
    gradient.addColorStop(1, backgroundEnd);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const patternCanvas = createCanvas(72, 72);
    const patternContext = patternCanvas.getContext("2d");
    patternContext.strokeStyle = hexToRgba(accentHex, 0.22);
    patternContext.lineWidth = 2;
    patternContext.beginPath();
    patternContext.moveTo(0, 54);
    patternContext.lineTo(54, 0);
    patternContext.stroke();
    patternContext.beginPath();
    patternContext.moveTo(18, 72);
    patternContext.lineTo(72, 18);
    patternContext.stroke();
    patternContext.fillStyle = "rgba(255,255,255,0.08)";
    patternContext.beginPath();
    patternContext.arc(56, 56, 4, 0, Math.PI * 2);
    patternContext.fill();
    const overlayPattern = context.createPattern(patternCanvas, "repeat");
    if (overlayPattern) {
      context.fillStyle = overlayPattern;
      context.fillRect(0, 0, width, height);
    }

    const glow = context.createRadialGradient(width * 0.8, 70, 10, width * 0.8, 70, 300);
    glow.addColorStop(0, hexToRgba(accentHex, 0.55));
    glow.addColorStop(1, hexToRgba(accentHex, 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255,255,255,0.1)";
    context.beginPath();
    context.arc(width - 120, 70, 170, 0, Math.PI * 2);
    context.fill();

    drawRoundedRect(context, 310, 48, 850, 320, 28);
    context.fillStyle = "rgba(9, 12, 14, 0.42)";
    context.fill();
    context.strokeStyle = hexToRgba(accentHex, 0.5);
    context.lineWidth = 2;
    context.stroke();

    const title = trimAndFallback(
      input.title,
      variant === "goodbye" ? "Hasta pronto" : "Bienvenido/a"
    );
    const displayName = trimAndFallback(input.displayName, "Invitado");
    const username = trimAndFallback(input.username, displayName);
    const subtitle = trimAndFallback(input.subtitle, `@${username}`);

    context.fillStyle = "#f7f8fa";
    context.font = "700 58px Sans";
    context.fillText(truncateToWidth(context, title, 780), 350, 148);

    context.fillStyle = "#ffffff";
    context.font = "700 54px Sans";
    context.fillText(truncateToWidth(context, displayName, 780), 350, 232);

    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = "33px Sans";
    context.fillText(truncateToWidth(context, subtitle, 780), 350, 290);

    context.fillStyle = hexToRgba(accentHex, 0.95);
    context.font = "700 24px Sans";
    context.fillText(variant === "goodbye" ? "SALIDA REGISTRADA" : "NUEVO MIEMBRO", 350, 338);

    const avatarX = 56;
    const avatarY = 96;
    const avatarSize = 230;

    const avatarRing = context.createLinearGradient(
      avatarX,
      avatarY,
      avatarX + avatarSize,
      avatarY + avatarSize
    );
    avatarRing.addColorStop(0, "rgba(255,255,255,0.9)");
    avatarRing.addColorStop(1, hexToRgba(accentHex, 0.95));

    context.beginPath();
    context.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2 + 10,
      0,
      Math.PI * 2
    );
    context.strokeStyle = avatarRing;
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
      placeholderGradient.addColorStop(0, hexToRgba(accentHex, 0.85));
      placeholderGradient.addColorStop(1, "rgba(255,255,255,0.28)");

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
      context.font = "700 78px Sans";
      const initials = initialsFromName(displayName);
      const initialsWidth = context.measureText(initials).width;
      context.fillText(initials, avatarX + (avatarSize - initialsWidth) / 2, avatarY + 140);
    }

    context.fillStyle = hexToRgba(accentHex, 0.9);
    context.fillRect(0, height - 14, width, 14);

    return canvas.toBuffer("image/png");
  }
}

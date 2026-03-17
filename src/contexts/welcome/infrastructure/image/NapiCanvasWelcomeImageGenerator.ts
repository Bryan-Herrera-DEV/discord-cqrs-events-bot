import type { WelcomeImageGeneratorPort, WelcomeImageInput } from "@contexts/welcome/application/ports/WelcomeImageGeneratorPort";

export class NapiCanvasWelcomeImageGenerator implements WelcomeImageGeneratorPort {
  public async generate(input: WelcomeImageInput): Promise<Buffer> {
    const canvasModule = await import("@napi-rs/canvas");
    const { createCanvas, loadImage } = canvasModule;

    const width = 1000;
    const height = 320;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#173728");
    gradient.addColorStop(1, "#1f5130");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255,255,255,0.08)";
    context.beginPath();
    context.arc(width - 120, 60, 180, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f7f4e8";
    context.font = "bold 52px Sans";
    context.fillText(input.title, 280, 120);
    context.font = "36px Sans";
    context.fillText(input.displayName, 280, 190);

    if (input.avatarUrl) {
      const avatar = await loadImage(input.avatarUrl);
      const avatarSize = 180;
      context.save();
      context.beginPath();
      context.arc(130, 160, avatarSize / 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      context.drawImage(avatar, 40, 70, avatarSize, avatarSize);
      context.restore();
    }

    return canvas.toBuffer("image/png");
  }
}

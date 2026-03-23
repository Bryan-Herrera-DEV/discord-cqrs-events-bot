export interface WelcomeImageInput {
  displayName: string;
  username: string;
  avatarUrl?: string;
  title: string;
  subtitle?: string;
  accentColor?: number;
  variant?: "welcome" | "goodbye";
}

export interface WelcomeImageGeneratorPort {
  generate(input: WelcomeImageInput): Promise<Buffer>;
}

export interface WelcomeImageInput {
  displayName: string;
  username: string;
  avatarUrl?: string;
  title: string;
}

export interface WelcomeImageGeneratorPort {
  generate(input: WelcomeImageInput): Promise<Buffer>;
}

import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

export interface BotModule {
  readonly name: string;
  register(context: AppContext): Promise<void>;
  registerSlashCommands(registry: SlashCommandRegistry): void;
}

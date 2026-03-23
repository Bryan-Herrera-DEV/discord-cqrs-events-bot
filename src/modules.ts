import { AdministrationModule } from "@contexts/administration";
import { GoodbyeModule } from "@contexts/goodbye";
import { GuildSettingsModule } from "@contexts/guild-settings";
import { GuildsModule } from "@contexts/guilds";
import { LevelsModule } from "@contexts/levels";
import { MembersModule } from "@contexts/members";
import { ModerationModule } from "@contexts/moderation";
import { MusicModule } from "@contexts/music";
import { RolesModule } from "@contexts/roles";
import { WelcomeModule } from "@contexts/welcome";
import type { BotModule } from "@shared/application/Module";

export const createModules = (): BotModule[] => [
  new GuildsModule(),
  new GuildSettingsModule(),
  new MembersModule(),
  new MusicModule(),
  new LevelsModule(),
  new RolesModule(),
  new WelcomeModule(),
  new GoodbyeModule(),
  new ModerationModule(),
  new AdministrationModule()
];

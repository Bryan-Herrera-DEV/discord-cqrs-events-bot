import { SlashCommandBuilder } from "discord.js";

import type { BotModule } from "@shared/application/Module";
import type { AppContext } from "@shared/application/context/AppContext";
import type { SlashCommandRegistry } from "@platform/discord/SlashCommandRegistry";

import { AdminPingQuery } from "@contexts/administration/application/queries/AdminPingQuery";
import { AdminPingHandler } from "@contexts/administration/application/queries/AdminPingHandler";

export class AdministrationModule implements BotModule {
  public readonly name = "administration";

  public async register(context: AppContext): Promise<void> {
    context.queryBus.register(AdminPingQuery.type, new AdminPingHandler());
  }

  public registerSlashCommands(registry: SlashCommandRegistry): void {
    registry.add(
      new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Comandos administrativos")
        .addSubcommand((subcommand) => subcommand.setName("ping").setDescription("Verifica latencia"))
        .addSubcommand((subcommand) =>
          subcommand
            .setName("config")
            .setDescription("Actualiza configuración general por guild")
            .addChannelOption((option) =>
              option
                .setName("logs_channel")
                .setDescription("Canal de logs de auditoría y moderación")
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("leveling_enabled")
                .setDescription("Activa o desactiva sistema de niveles")
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("moderation_enabled")
                .setDescription("Activa o desactiva módulo de moderación")
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName("language")
                .setDescription("Idioma base de la guild")
                .setRequired(false)
                .addChoices(
                  { name: "Español", value: "es-ES" },
                  { name: "English", value: "en-US" }
                )
            )
        )
    );
  }
}

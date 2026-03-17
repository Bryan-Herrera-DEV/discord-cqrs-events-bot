import type {
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder
} from "discord.js";

type CommandBuilderLike = {
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
};

export class SlashCommandRegistry {
  private readonly commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];

  public add(command: SlashCommandBuilder | CommandBuilderLike): void {
    this.commands.push(command.toJSON() as RESTPostAPIChatInputApplicationCommandsJSONBody);
  }

  public getAll(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return [...this.commands];
  }
}

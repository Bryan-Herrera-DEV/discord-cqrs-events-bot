import { registerSlashCommands } from "@/app";

const run = async (): Promise<void> => {
  await registerSlashCommands();
};

void run();

import { startApp } from "@/app";

const bootstrap = async (): Promise<void> => {
  await startApp();
};

void bootstrap();

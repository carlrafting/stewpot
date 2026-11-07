import { lumeBuildAdapter } from "./build/adapter.ts";
import createApp, { defaultOptions } from "./main.ts";

const app = await createApp({
  ...defaultOptions,
  build: lumeBuildAdapter
});

export default app;

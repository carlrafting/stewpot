import { cyan, green } from "@std/fmt/colors";
import type { Options } from "@stewpot/cli";
import type { FeedData } from "./main.ts";
import type { FsStorage, KvStorage } from "./storage.ts";
import type { Configuration } from "./config.ts";
import app from "./reader.ts";

export async function createServer(
  config: Configuration,
  options: Options,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<void> {
  const controller = new AbortController();
  const signal = controller.signal;
  const handler = await app(
    feeds,
    store,
  );
  const hostname = (Deno.env.get("HOSTNAME") || options.hostname ||
    config?.reader?.hostname) ??
    "localhost";
  const port = (Deno.env.get("PORT") || options.port || config?.reader?.port) ??
    8000;
  const serveOptions: Deno.ServeTcpOptions = {
    hostname,
    port,
    signal,
    onListen({ port, hostname }) {
      console.log(
        cyan("info"),
        `Serving reader at http://${hostname}:${port}`,
      );
      console.log(cyan("info"), "Press Ctrl+C to exit");
    },
  } as Deno.ServeTcpOptions;
  const server = Deno.serve(serveOptions, handler.fetch);
  Deno.addSignalListener("SIGINT", async () => {
    console.log(cyan("info"), "shutting down reader...");
    await server.shutdown();
  });
  await server.finished;
  console.log(
    green("done"),
    "reader shutdown was finished successfully",
  );
}

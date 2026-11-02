import { cyan, green } from "@std/fmt/colors";
import type { Options } from "@stewpot/cli";
import type { FeedData } from "./main.ts";
import type { FsStorage, KvStorage } from "./storage.ts";
import type { Configuration } from "./config.ts";
import app from "./reader.ts";
import type { ReaderAuth } from "./reader.ts";

export async function createServer(
  config: Configuration,
  options: Options,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<void> {
  const optionHostname = typeof options?.hostname === "string"
    ? options.hostname
    : undefined;
  const hostname = resolveReaderHostname(
    optionHostname,
    config?.reader?.hostname,
  );
  const auth = resolveReaderAuth(
    hostname,
    Deno.env.get("READER_USERNAME"),
    Deno.env.get("READER_PASSWORD"),
  );
  const controller = new AbortController();
  const signal = controller.signal;
  const handler = await app(feeds, store, auth);
  const envPort = Deno.env.get("PORT");
  const configuredPort = envPort || (options.port ?? config?.reader?.port);
  const port = configuredPort === undefined ? 8000 : Number(configuredPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new RangeError(`invalid reader port: ${configuredPort}`);
  }
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
  };
  // } as Deno.ServeTcpOptions;

  const server = Deno.serve(serveOptions, handler.fetch);
  const shutdown = async () => {
    console.log(cyan("info"), "shutting down reader...");
    controller.abort();
    await server.shutdown();
  };

  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);

  await server.finished;
  console.log(
    green("done"),
    "reader shutdown was finished successfully",
  );
}

export function resolveReaderHostname(
  optionHostname: string | undefined,
  configuredHostname: string | undefined,
): string {
  return optionHostname ?? configuredHostname ?? "127.0.0.1";
}

export function resolveReaderAuth(
  hostname: string,
  username: string | undefined,
  password: string | undefined,
): ReaderAuth | undefined {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "::1"
  ) {
    return undefined;
  }

  if (!username || !password) {
    throw new Error(
      "Non-loopback reader binding requires READER_USERNAME and READER_PASSWORD environment variables",
    );
  }
  return { username, password };
}

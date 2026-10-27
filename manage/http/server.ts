/**
 * `createServer` creates an http server with `Deno.serve()` API
 *
 * @example
 *
 * import { createServer } from "@stewpot/manage";
 * const options: Deno.ServeTcpOptions = {
 *   port: 3000,
 * };
 * await createServer(
 *   (req: Request) => new Response("Hello World!"),
 *   options
 * );
 *
 * @param instance app instance to create server for
 * @param options options for http server
 */
export async function createServer(
  instance: Deno.ServeDefaultExport,
  options: Deno.ServeTcpOptions = {},
) {
  const abortController = new AbortController();
  const signal = abortController.signal;
  const hostname = "localhost";
  const port = 8000;
  const onListen: Deno.ServeTcpOptions["onListen"] = (localAddr) => {
    console.log(
      "[server]",
      `Listening on ${localAddr.hostname}:${localAddr.port}`,
    );
  };
  const server = Deno.serve({
    hostname,
    port,
    signal,
    onListen,
    ...options,
  }, instance.fetch);
  Deno.addSignalListener("SIGINT", () => {
    console.log("[SIGNINT] server shut down...");
    abortController.abort();
  });
  await server.finished;
  server.shutdown();
  console.log("server shutdown finished!");
}

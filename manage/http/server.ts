interface Options extends Deno.ServeTcpOptions {}

export async function createServer(
  instance: Deno.ServeDefaultExport,
  options: Options = {},
) {
  const abortController = new AbortController();
  const signal = abortController.signal;
  const hostname = "localhost";
  const port = 8000;
  const server = Deno.serve({
    hostname,
    port,
    signal,
    ...options,
  }, instance.fetch);
  Deno.addSignalListener("SIGINT", () => {
    console.log("[SIGNINT] server shut down...");
    abortController.abort();
  });
  Deno.addSignalListener("SIGABRT", () => {
    console.log("[SIGABRT] got abort signal, shut down...");
    abortController.abort();
  });
  await server.finished;
}

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
  Deno.addSignalListener("SIGABRT", () => {
    console.log("[SIGABRT] got abort signal, shut down...");
    abortController.abort();
  });
  await server.finished;
  server.shutdown();
  console.log("server shutdown finished!");
}

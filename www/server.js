import Server from "lume/core/server.ts";

const server = new Server({
  port: 8000,
  root: `${Deno.cwd()}/www/dist`,
});

server.start();

console.log("Listening on http://localhost:8000");

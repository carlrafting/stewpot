import stewpot from "stewpot";
import { dirname, fromFileUrl } from "path/mod.ts";

const directory = dirname(fromFileUrl(import.meta.url));

function handler() {
  return new Response("Hello there from handler.js!");
}

stewpot({
  directory,
  handler,
});

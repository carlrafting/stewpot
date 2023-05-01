import stewpot, { Router, send } from "../../stewpot.js";
import { errors } from "../../deps.js";

function module() {
  const router = new Router();

  router.add("GET", "/", async ({ render }) => {
    const date = new Date().toLocaleString();
    return send(await render("index", { data: { date } }));
  });

  router.add("GET", "/posts", async ({ render }) => {
    return send(await render("posts/index"));
  });

  router.add("GET", "/boom", () => {
    throw Error("BOOM!");
  });

  router.add("GET", "/error", () => {
    throw new errors.InternalServerError("Something went wrong!");
  });

  return {
    router,
  };
}

export function main() {
  return stewpot({
    root: "packages/deno/examples/router",
    module,
  });
}

if (import.meta.main) {
  main();
}

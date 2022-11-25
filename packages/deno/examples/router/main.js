import stewpot, { Router } from "../../stewpot.js";
import { join } from "../../deps.js";

export default function main() {
  const router = new Router();

  router.add("GET", "/", async ({ render }) => {
    return await render("index");
  });

  router.add("GET", "/posts", async ({ render }) => {
    return await render("posts/index");
  });

  router.add("GET", "/boom", () => {
    throw Error("BOOM!");
  });

  return {
    router,
  };
}

if (import.meta.main) {
  try {
    stewpot({
      root: join(Deno.cwd(), "packages/deno/examples/router"),
      module: main,
    });
  } catch (error) {
    console.log(error);
  }
}

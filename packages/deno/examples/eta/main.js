import stewpot from "stewpot/stewpot.js";
import { join } from "../../deps.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return await render("index", { format: "eta" });
    };
  }
}

if (import.meta.main) {
  stewpot({
    directory: join(Deno.cwd(), "packages/deno/examples/eta"),
    handler,
    // templateFormat: "eta",
  });
}

import stewpot from "stewpot/stewpot.js";
import { join } from "../../deps.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return await render("index", { data: { message: "eta" } });
    };
  }
  if (pathname === "/string") {
    return async () => {
      return await render("<h1>Hello from <%= it.message %>!</h1>", { inline: true, data: { message: "eta" } });
    };
  }
}

if (import.meta.main) {
  stewpot({
    root: join(Deno.cwd(), "packages/deno/examples/eta"),
    handler,
    templateFormat: "eta",
  });
}

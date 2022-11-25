import stewpot from "stewpot/stewpot.js";
import { join } from "stewpot/deps.js";
import nunjucksPlugin from "stewpot/plugins/nunjucks.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return await render("index", { data: { message: "Nunjucks" } });
    };
  }
  if (pathname === "/string") {
    return async () => {
      return await render("<h1>Hello from {{ message }}!</h1>", {
        inline: true,
        data: { message: "Nunjucks" },
      });
    };
  }
}

if (import.meta.main) {
  stewpot({
    root: join(Deno.cwd(), "packages/deno/examples/nunjucks"),
    handler,
    plugins: [
      nunjucksPlugin(),
    ],
    templateFormat: "njk",
  });
}

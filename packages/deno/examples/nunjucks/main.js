import stewpot, { send } from "stewpot/stewpot.js";
import nunjucksPlugin from "stewpot/plugins/nunjucks.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return send(await render("index", { data: { message: "Nunjucks" } }));
    };
  }
  if (pathname === "/string") {
    return async () => {
      return send(await render("<h1>Hello from {{ message }}!</h1>", {
        inline: true,
        data: { message: "Nunjucks" },
      }));
    };
  }
}

if (import.meta.main) {
  stewpot({
    root: "packages/deno/examples/nunjucks",
    handler,
    plugins: [
      nunjucksPlugin(),
    ],
    templateFormat: "njk",
  });
}

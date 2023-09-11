import stewpot, { send } from "../../stewpot.js";
import { nunjucksPlugin } from "../../plugins.js";

function handler({ pathname, render }) {
  const date = new Date().toLocaleString();
  if (pathname === "/") {
    return async () => {
      return send(
        await render("index", { data: { message: "Nunjucks", date } }),
      );
    };
  }
  if (pathname === "/string") {
    return async () => {
      return send(
        await render("<h1>Hello from {{ message }}!</h1>\n<p>{{ date }}</p>", {
          inline: true,
          data: { message: "Nunjucks", date },
        }),
      );
    };
  }
}

export function main() {
  return stewpot({
    root: import.meta.url,
    handler,
    plugins: [
      nunjucksPlugin(),
    ],
    templateFormat: "njk",
  });
}

if (import.meta.main) {
  main();
}

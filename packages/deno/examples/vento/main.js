import stewpot, { send } from "../../stewpot.js";
import ventoPlugin from "../../plugins/vento.js";

function handler({ pathname, render }) {
  const date = new Date().toLocaleString();
  if (pathname === "/") {
    return async () => {
      return send(
        await render("index", {
          data: { title: "Welcome to Vento!", message: "Vento", date },
        }),
      );
    };
  }
  if (pathname === "/string") {
    return async () => {
      return send(
        await render("<h1>Hello {{ title }}</h1>", {
          inline: true,
          data: { title: "Vento" },
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
      ventoPlugin(),
    ],
    templateFormat: "vto",
  });
}

if (import.meta.main) {
  console.log(import.meta);
  main();
}

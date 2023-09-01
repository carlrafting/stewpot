import stewpot, { send } from "../../stewpot.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return send(await render("index", { data: { message: "eta" } }));
    };
  }
  if (pathname === "/string") {
    return async () => {
      return send(
        await render("<h1>Hello from <%= it.message %>!</h1>", {
          inline: true,
          data: { message: "eta" },
        }),
      );
    };
  }
}

export function main() {
  return stewpot({
    root: "packages/deno/examples/eta",
    handler,
    templateFormat: "eta",
  });
}

if (import.meta.main) {
  main();
}

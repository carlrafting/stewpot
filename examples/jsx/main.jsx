import { send, stewpot } from "../../stewpot.js";
import { home } from "./pages/home.jsx";
import { about } from "./pages/about.jsx";
import { jsxPlugin } from "../../plugins.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      const date = new Date().toLocaleString();
      return send(
        await render(home({ date }), {
          inline: true,
          data: { title: "Welcome Home!" },
        }),
      );
    };
  }
  if (pathname === "/about") {
    return async () => {
      return send(
        await render(about, {
          inline: true,
          data: { title: "Welcome to About" },
        }),
      );
    };
  }
}

export function main() {
  return stewpot({
    handler,
    plugins: [jsxPlugin()],
    templateFormat: "jsx",
  });
}

if (import.meta.main) {
  main();
}

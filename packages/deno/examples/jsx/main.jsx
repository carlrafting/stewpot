import stewpot, { send } from "stewpot/stewpot.js";
import { home } from "./pages/home.jsx";
import { about } from "./pages/about.jsx";
import jsxPlugin from "stewpot/plugins/jsx.js";

function handler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      return send(await render(home, { inline: true, data: { title: "Welcome Home!"} }));
    };
  }
  if (pathname === "/about") {
    return async () => {
      return send(await render(about, { inline: true, data: { title: "Welcome to About" } }));
    };
  }
}

stewpot({
  handler,
  plugins: [jsxPlugin()],
  templateFormat: "jsx",
});

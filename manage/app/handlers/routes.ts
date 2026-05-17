import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import nav from "../nav.ts";
import type * as Data from "../data.ts";

export default {
  name: "routes",
  method: "GET",
  pathname: "/routes/",
  async handler({ render, url, headers }) {
    const title = "Routes";
    const routes: Data.Route[] = [
      {
        name: "Black",
        path: "/black/",
        type: "static",
        ref: "files/black.png",
      },
    ];
    const data: { routes: Data.Route[] } = { routes };
    const page = await render("routes/index.vto");
    const body = await page({ title, url, nav, data });
    return html(body, { headers });
  },
} as Route;

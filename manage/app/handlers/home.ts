import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import nav from "../nav.ts";

export default {
  name: "home",
  pathname: "/",
  method: "GET",
  async handler({
    render,
    url,
    headers,
  }): Promise<Response> {
    const title = "Manage anything!";
    const page = await render("welcome/index.vto");
    const body = await page({ title, url, nav });
    return html(body, { headers });
  },
} as Route;

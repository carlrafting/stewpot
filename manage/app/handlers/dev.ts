import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";

export default [
  {
    name: "dev_htmltest",
    method: "GET",
    pathname: "/dev/html",
    async handler({ render }): Promise<Response> {
      const template = await render("dev/html.vto");
      const page = await template({});
      return html(page);
    },
  },
] as Route[];

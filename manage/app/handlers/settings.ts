import { STATUS_CODE } from "@std/http/status";
import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import { KvRepository } from "../../kv/repository.ts";
import type { Session } from "../../session/kv.ts";
import nav from "../nav.ts";

export default [
  {
    name: "settings_index",
    method: "GET",
    pathname: "/settings/",
    async handler({ render, headers, url }) {
      const title = "Settings";
      const description = "Settings for manage application";
      const text = "Here be some settings...";
      const key = "sessions";
      const repository = new KvRepository(key);
      const page = await render("settings/index.vto");
      const data = await repository.getAllByKey<Session>(key);
      const body = await page({ title, description, url, nav, text, data });
      return html(body, { headers });
    },
  },
  {
    name: "settings_clear_browser_data",
    method: "POST",
    pathname: "/settings/browser/",
    async handler({ request }) {
      const formData = await request.formData();
      const formDataKey = formData.getAll("data");
      const status = STATUS_CODE.Found;
      const headerValues = [];
      for (const [, entry] of formData) {
        if (
          entry.toString() === "cookies" || entry.toString() === "storage" ||
          entry.toString() === "cache"
        ) {
          headerValues.push(`"${entry.toString()}"`);
        }
      }
      if (formDataKey) {
        const headers = new Headers({
          "clear-site-data": headerValues.join(", "),
          "location": new URL("/settings/", request.url).href,
        });
        return new Response(null, {
          status,
          headers,
        });
      }
      // const jsonResponse = Array.from(formData?.entries());
      // return json(jsonResponse);
      return Response.redirect(request.url, status);
    },
  },
] as Route[];

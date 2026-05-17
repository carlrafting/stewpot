import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import { KvRepository } from "../../kv/repository.ts";
import type { Session } from "../../session/kv.ts";
import nav from "../nav.ts";

export default {
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
} as Route;

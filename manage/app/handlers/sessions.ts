import { html } from "../../http/response.ts";
import type { Route } from "../../http/routes.ts";
import { KvRepository } from "../../kv/repository.ts";
import type { Session } from "../../session/kv.ts";
import nav from "../nav.ts";

export default {
  name: "sessions_index",
  method: "GET",
  pathname: "/sessions/",
  async handler({ render, headers, url }) {
    const title = "Sessions";
    const description = "All current sessions that hasn't expired yet.";
    const key = "sessions";
    const repository = new KvRepository(key);
    const page = await render("sessions/index.vto");
    const sessions = await repository.getAllByKey<Session>(key);
    const data: { sessions: Session[] } = { sessions: [] };
    for (const { key, value, versionstamp } of sessions) {
      data.sessions.push(value);
    }
    const body = await page({ title, description, url, nav, data });
    return html(body, { headers });
  },
} as Route;

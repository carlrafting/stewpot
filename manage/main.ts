import { getCookies, serveDir } from "@std/http";
import type { Options as VentoOptions } from "@ventojs/vento";
import vento from "@ventojs/vento";
import { createSessionCookie } from "./session/cookie.ts";
import { html } from "./http/response.ts";
import { createServer } from "./http/server.ts";
import { createConnections } from "./kv/connections.ts";

export interface Options {
  vento: VentoOptions;
  sessions: {
    path?: string;
  };
  kv: {
    path?: string;
  };
}

export const defaultOptions: Options = {
  vento: {
    includes: "templates",
  },
  sessions: {
    path: "database/sessions.db",
  },
  kv: {
    path: "database/kv.db",
  },
};

export async function app(_options?: Options) {
  const options = {
    ...defaultOptions,
    ..._options,
  };
  const connections = await createConnections(options);
  console.log(connections);
  const templates = vento(options.vento);
  const userPagePattern = new URLPattern({ pathname: "/users/:id" });
  const staticPathPattern = new URLPattern({ pathname: "/assets/*" });
  return {
    async fetch(request: Request, info?: Deno.ServeHandlerInfo) {
      if (info) {
        const remoteAddr = info.remoteAddr;
        console.log({
          remoteAddr,
        });
      }
      const cookies = getCookies(request.headers);
      console.log(cookies);
      const headers = new Headers();
      const sessionID = cookies["session"];
      console.log(sessionID);
      const url = new URL(request.url);

      if (!sessionID) {
        await createSessionCookie(connections, request, headers);
      }

      if (url.pathname === "/") {
        const page = await templates.run("index.vto", {
          title: "Manage anything!",
        });
        return html(page.content, headers);
      }

      const userPageMatch = userPagePattern.exec(url);
      if (userPageMatch) {
        return new Response(userPageMatch.pathname.groups.id, {
          headers,
        });
      }

      if (staticPathPattern.test(url)) {
        return serveDir(request);
      }

      return new Response("Not found", { status: 404, headers });
    },
  } satisfies Deno.ServeDefaultExport;
}

export default app;

if (import.meta.main) {
  {
    const handler = await app();
    await createServer(handler);
  }
}

import { getCookies, serveDir, setCookie } from "@std/http";
import { FileLoader } from "ventojs/loaders/file.js";
import { createSession } from "./session/kv.ts";
import { COOKIE_NAME, createSessionCookie } from "./session/cookie.ts";
import { createServer } from "./http/server.ts";
import { createConnections, getConnection } from "./kv/connections.ts";
import { KvRepository } from "./kv/repository.ts";
import { matchRoutes, type RouteContext } from "./http/routes.ts";
import { dirname, fromFileUrl } from "@std/path";
import { routes } from "./app/routes.ts";
import { createSessionManager } from "./session/manager.ts";
import { createFlash } from "./flash/message.ts";
import { I18n } from "./i18n/locale.ts";
import { createTemplateRender, type VentoOptions } from "./vento/templates.ts";

export { createServer };

/** app options interface */
export interface Options {
  /** vento options from vento package */
  vento: VentoOptions;
  /** session config options */
  sessions: {
    /** path to session kv db */
    path?: string;
  };
  /** main kv db config options */
  kv: {
    /** path to main kv db */
    path?: string;
  };
}

/** default app config options */
export const defaultOptions: Options = {
  vento: {
    includes: new FileLoader(
      new URL("templates", import.meta.url).pathname,
    ),
  },
  sessions: {
    path: "database/sessions.db",
  },
  kv: {
    path: "database/kv.db",
  },
};

/** create app instance */
export async function app(
  _options?: Options,
): Promise<Deno.ServeDefaultExport> {
  const options = {
    ...defaultOptions,
    ..._options,
  };
  const connections = await createConnections(options);
  // console.log(connections);
  KvRepository.connections = connections;
  const render = createTemplateRender(options.vento);
  const staticPathPattern = new URLPattern({ pathname: "/assets/*" });
  return {
    async fetch(
      request: Request,
      info?: Deno.ServeHandlerInfo,
    ) {
      if (info) {
        const remoteAddr = info.remoteAddr;
        // console.log({
        //   remoteAddr,
        // });
      }
      const url = new URL(request.url);
      const headers = new Headers();
      const sessionKv = getConnection(connections, "sessions");
      const cookies = getCookies(request.headers);
      const sessionId = cookies[COOKIE_NAME];
      if (!sessionKv) {
        throw "session kv store was undefined!";
      }
      if (!sessionId) {
        const id = await createSession(request, sessionKv);
        const sessionCookie = createSessionCookie(connections, request, id);
        setCookie(headers, sessionCookie);
        headers.set("location", request.url);
        return new Response(null, { status: 302, headers });
      }
      const sessionManager = await createSessionManager(request, connections);
      const i18n = new I18n(request, sessionManager);
      const flash = await createFlash(sessionManager);

      const context: RouteContext = {
        request,
        headers,
        url,
        render,
        connections,
        sessionManager,
        i18n,
        flash,
      };

      if (staticPathPattern.test(url)) {
        const fsRoot: string = dirname(fromFileUrl(new URL(import.meta.url)));
        return await serveDir(
          request,
          { fsRoot },
        );
      }

      return await matchRoutes(routes, context) as Response;
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

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
import { createTemplateRender } from "./vento/templates.ts";

/** app options interface */
export interface Options {
  /** Import meta from the entrypoint, used to resolve paths */
  meta: ImportMeta;
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
const defaultOptions: Options = {
  meta: import.meta,
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
  const render = createTemplateRender({
    includes: new FileLoader(
      new URL("templates", import.meta.url).pathname,
    ),
  });
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
      const start = performance.now();
      const url = new URL(request.url);
      const headers = new Headers();
      const sessionKv = getConnection(connections, "sessions");
      const cookies = getCookies(request.headers);
      const sessionId = cookies[COOKIE_NAME];
      if (!sessionKv) {
        throw "session kv store was undefined!";
      }
      if (!sessionId) {
        {
          const id = await createSession(request, sessionKv);
          const sessionCookie = createSessionCookie(request, id);
          setCookie(headers, sessionCookie);
          headers.set("location", request.url);
          return new Response(null, { status: 302, headers });
        }
      }
      const sessionManager = await createSessionManager(request, connections);
      const i18n = new I18n(request, sessionManager);
      const flash = createFlash(sessionManager);
      const params = {};

      const context: RouteContext = {
        request,
        headers,
        url,
        render,
        connections,
        sessionManager,
        i18n,
        flash,
        params,
      };

      if (staticPathPattern.test(url)) {
        const fsRoot: string = dirname(fromFileUrl(new URL(import.meta.url)));
        return await serveDir(
          request,
          { fsRoot },
        );
      }

      const response = await matchRoutes(routes, context) as Response;
      const duration = (performance.now() - start).toFixed(2);
      console.log(
        `${request.method} ${url.pathname} ${response.status} ${duration}ms`,
      );

      return response;
    },
  } satisfies Deno.ServeDefaultExport;
}

if (import.meta.main) {
  {
    const handler = await app();
    await createServer(handler);
  }
}

export default app;
export { createServer };

import { getCookies, serveDir, setCookie } from "@std/http";
import { FileLoader } from "ventojs/loaders/file.js";
import { createSession } from "./session/kv.ts";
import { COOKIE_NAME, createSessionCookie } from "./session/cookie.ts";
import { createServer } from "./http/server.ts";
import { createConnections, getConnection } from "./kv/connections.ts";
import { KvRepository } from "./kv/repository.ts";
import { matchRoutes, type RouteContext } from "./http/routes.ts";
import { dirname, fromFileUrl, resolve } from "@std/path";
import { routes } from "./app/routes.ts";
import { createSessionManager } from "./session/manager.ts";
import { createFlash } from "./flash/message.ts";
import { I18n } from "./i18n/locale.ts";
import { createTemplateRender } from "./vento/templates.ts";
import { type BuildAdapter, lumeBuildAdapter } from "./build/adapter.ts";

/** app options interface */
export interface Options {
  /** Import meta from the entrypoint, used to resolve paths */
  meta: Pick<ImportMeta, "url">;
  /** session config options */
  sessions?: {
    /** path to session kv db */
    path?: string;
  };
  /** main kv db config options */
  kv?: {
    /** path to main kv db */
    path?: string;
  };
  /** optional static site build adapter */
  build?: BuildAdapter;
}

/** default app config options */
export const defaultOptions: Options = {
  meta: import.meta,
  sessions: {
    path: "database/sessions.db",
  },
  kv: {
    path: "database/kv.db",
  },
};

/** App handler returned by {@link app}. */
export interface ManageApp extends Deno.ServeDefaultExport {
  /** Close the app's KV connections. */
  close(): Promise<void>;
}

/** create app instance */
export async function app(
  _options?: Options,
): Promise<ManageApp> {
  const options = {
    ...defaultOptions,
    ..._options,
    sessions: { ...defaultOptions.sessions, ..._options?.sessions },
    kv: { ...defaultOptions.kv, ..._options?.kv },
  };
  const connections = await createConnections(options);
  // console.log(connections);
  KvRepository.connections = connections;
  const render = createTemplateRender({
    includes: new FileLoader(
      fromFileUrl(new URL("templates", import.meta.url)),
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
        throw new Error("KV session store could not be determined!");
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
        responseCompleted: info?.completed,
        headers,
        url,
        render,
        connections,
        sessionManager,
        i18n,
        flash,
        params,
        projectRoot: resolve(fromFileUrl(new URL(".", options.meta.url))),
        buildAdapter: options.build,
      };

      if (staticPathPattern.test(url)) {
        const quiet = true;
        const fsRoot: string = dirname(fromFileUrl(new URL(import.meta.url)));
        return await serveDir(
          request,
          { fsRoot, quiet },
        );
      }

      const d = new Date().toISOString();
      const dateFmtStart: string = d.slice(0, 10);
      const dateFmtEnd: string = d.slice(11, 19);
      const response: Response = await matchRoutes(routes, context) as Response;
      const duration: string = (performance.now() - start).toFixed(2);
      console.log(
        `[${dateFmtStart} ${dateFmtEnd}] [${request.method}] ${response.status} ${url.pathname} ${duration}ms`,
      );

      return response;
    },
    async close() {
      await Promise.all(
        [...connections.values()].map((connection) => connection.close()),
      );
    },
  } satisfies ManageApp;
}

if (import.meta.main) {
  {
    const handler = await app({
      ...defaultOptions,
      build: lumeBuildAdapter,
    });
    await createServer(handler);
  }
}

export default app;
export { createServer };
export {
  collectDocumentBuildSnapshot,
  writeDocumentPages,
} from "./build/documents.ts";
export type { PublishedDocumentPage } from "./build/documents.ts";
export type { BuildAdapter, BuildContext } from "./build/adapter.ts";
export type { Block, BlockContent, BlockType, Document } from "./app/data.ts";
export { blockTypes } from "./app/data.ts";
export { lumeBuildAdapter } from "./build/adapter.ts";

import { getCookies, serveDir } from "@std/http";
import type { Options as VentoOptions } from "ventojs/mod.js";
import { FileLoader } from "ventojs/loaders/file.js";
import vento from "ventojs/mod.js";
import { COOKIE_NAME, createSessionCookie } from "./session/cookie.ts";
import { createServer } from "./http/server.ts";
import { createConnections } from "./kv/connections.ts";
import { KvRepository } from "./kv/repository.ts";
import {
  type Extract,
  // extractJson,
  // extractToml,
  extractYaml,
  type Format as FrontMatterFormat,
  test as testFM,
} from "@std/front-matter";
import { matchRoutes, type RouteContext } from "./http/routes.ts";
import { dirname, fromFileUrl } from "@std/path";
import { routes } from "./app/routes.ts";

export type { VentoOptions };
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

export type TemplateRenderFunction = (
  data: Record<string, unknown> | undefined,
) => Promise<string>;

function createTemplateRender(options: VentoOptions) {
  return (async (
    file: string,
  ): Promise<TemplateRenderFunction> => {
    const templates = vento(options);
    const template = await templates.load(file);
    // console.log({ template });
    const source = template.source;
    const frontmatterFormat = "yaml";
    const hasFrontmatter = testFM(source, [frontmatterFormat]);
    // const hasFrontmatter = false;
    return async (data: Record<string, unknown> | undefined) => {
      if (!hasFrontmatter) {
        const view = await template(data);
        return view.content;
      }
      const frontmatterData: Extract<FrontMatterFormat> = extractYaml(source);
      const attrs = frontmatterData;
      const view = await templates.runString(frontmatterData.body, {
        ...attrs,
        ...data,
      });
      return view.content;
    };
  });
}

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
      const cookies = getCookies(request.headers);
      // console.log(cookies);
      const headers = new Headers();
      const sessionID = cookies[COOKIE_NAME];
      // console.log(sessionID);
      const url = new URL(request.url);

      const context: RouteContext = {
        request,
        headers,
        url,
        render,
        connections,
      };

      if (!sessionID) {
        await createSessionCookie(connections, request, headers);
      }

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

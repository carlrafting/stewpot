import { getCookies, serveDir } from "@std/http";
import type { Options as VentoOptions } from "@ventojs/vento";
import vento from "@ventojs/vento";
import { createSessionCookie } from "./session/cookie.ts";
import { html, notFound } from "./http/response.ts";
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

export type { VentoOptions };

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
    includes: "templates",
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
  console.log(connections);
  KvRepository.connections = connections;
  const templates = vento(options.vento);
  const render = async (file: string) => {
    const template = await templates.load(file);
    const source = template.source;
    const frontmatterFormat = "yaml";
    const hasFrontmatter = testFM(source, [frontmatterFormat]);
    console.log({ source, frontmatter: hasFrontmatter });
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
  };
  const userPagePattern = new URLPattern({ pathname: "/users/:id" });
  const staticPathPattern = new URLPattern({ pathname: "/assets/*" });
  return {
    async fetch(
      request: Request,
      info?: Deno.ServeHandlerInfo,
    ) {
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
        const title = "Manage anything!";
        const page = await render("dev/index.vto");
        // const page = await templates.run("dev/index.vto", {
        //   url,
        //   title: "Manage anything!",
        // });
        const body = await page({ title, url });
        return html(body, { headers });
      }

      if (url.pathname === "/sessions/") {
        const title = "Sessions";
        const key = "sessions";
        const repository = new KvRepository(key);
        const page = await render("dev/index.vto");
        const data = repository.getAllByKey(key);
        const body = await page({ title, url, data });
        return html(body, { headers });
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

      return notFound();
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

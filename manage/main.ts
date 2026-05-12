import { getCookies, serveDir } from "@std/http";
import type { Options as VentoOptions } from "ventojs/mod.js";
import vento from "ventojs/mod.js";
import { COOKIE_NAME, createSessionCookie } from "./session/cookie.ts";
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
import { createFlash } from "./flash/message.ts";

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
    includes: "templates",
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

const nav = [
  { text: "Home", href: "/" },
  { text: "Library", href: "/library/" },
  { text: "Sessions", href: "/sessions/" },
  { text: "Settings", href: "/settings/" },
];

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
      // console.log(cookies);
      const headers = new Headers();
      const sessionID = cookies[COOKIE_NAME];
      // console.log(sessionID);
      const url = new URL(request.url);

      if (!sessionID) {
        await createSessionCookie(connections, request, headers);
      }

      if (staticPathPattern.test(url)) {
        return serveDir(request);
      }

      // if (!url.pathname.endsWith("/")) {
      //   return Response.redirect(url.href.concat("/"));
      // }

      if (url.pathname === "/") {
        const title = "Manage anything!";
        const page = await render("welcome/index.vto");
        const body = await page({ title, url, nav });
        return html(body, { headers });
      }

      if (url.pathname === "/library/") {
        const title = "Library";
        const description = "This is the library...";
        const page = await render("library/index.vto");
        const body = await page({ title, description, url, nav });
        return html(body, { headers });
      }

      if (url.pathname === "/sessions/") {
        const title = "Sessions";
        const key = "sessions";
        const repository = new KvRepository(key);
        const page = await render("dev/index.vto");
        const data = await repository.getAllByKey(key);
        const body = await page({ title, url, nav, data });
        return html(body, { headers });
      }

      const userPageMatch = userPagePattern.exec(url);
      if (userPageMatch) {
        return new Response(userPageMatch.pathname.groups.id, {
          headers,
        });
      }

      const title = "Page was not found!";
      const template = await render("errors/not_found.vto");
      const page = await template({ title, url, nav });
      return notFound(page);
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

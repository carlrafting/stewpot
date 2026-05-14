import { getCookies, serveDir } from "@std/http";
import type { Options as VentoOptions } from "ventojs/mod.js";
import { FileLoader } from "ventojs/loaders/file.js";
import vento from "ventojs/mod.js";
import { COOKIE_NAME, createSessionCookie } from "./session/cookie.ts";
import { html } from "./http/response.ts";
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
import { matchRoutes, type Route, type RouteContext } from "./http/routes.ts";
import { dirname, fromFileUrl } from "@std/path";

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

const nav = [
  { text: "Home", href: "/" },
  { text: "Documents", href: "/documents/" },
  { text: "Routes", href: "/routes/" },
  { text: "Library", href: "/library/" },
  { text: "Sessions", href: "/sessions/" },
  { text: "Settings", href: "/settings/" },
];

interface Document {
  title: string;
  content: string;
  created: string;
}

interface PageContext {}

const routes: Route[] = [
  {
    name: "home",
    pathname: "/",
    method: "GET",
    async handler({
      render,
      url,
      headers,
    }): Promise<Response> {
      const title = "Manage anything!";
      const page = await render("welcome/index.vto");
      const body = await page({ title, url, nav });
      return html(body, { headers });
    },
  },
  {
    name: "routes",
    method: "GET",
    pathname: "/routes/",
    async handler({ render, url, headers }) {
      const title = "Routes";
      const routes = [
        {
          name: "Black",
          path: "/black/",
          type: "static",
          ref: "files/black.png",
        },
      ];
      const page = await render("routes/index.vto");
      const body = await page({ title, url, nav, routes });
      return html(body, { headers });
    },
  },
  {
    name: "documents_index",
    pathname: "/documents/",
    method: "GET",
    async handler(
      { render, url, connections, headers }: RouteContext,
    ): Promise<Response> {
      const title = "Documents";
      const description = "Edit &amp; create new documents";
      const kv = connections.get("kv");
      const data: { documents: Document[] } = { documents: [] };
      if (kv) {
        const prefix = ["documents"];
        const documents = kv.list<Document>({ prefix });
        for await (const document of documents) {
          data.documents.push(document.value);
        }
      }
      const page = await render("documents/index.vto");
      const body = await page({ title, description, url, nav, routes, data });
      return html(body, { headers });
    },
  },
  {
    name: "new_document",
    pathname: "/documents/new/",
    method: "GET",
    async handler({ render, url, headers }: RouteContext): Promise<Response> {
      const title = "New Document";
      const description = "Create new document";
      const page = await render("documents/new.vto");
      const body = await page({ title, description, url, nav, routes });
      return html(body, { headers });
    },
  },
  {
    name: "create_document",
    pathname: "/documents/create/",
    method: "POST",
    async handler(
      { render, request, url, connections }: RouteContext,
    ): Promise<Response> {
      const id = crypto.randomUUID();
      const key = ["documents", id];
      const formData = request.formData();
      const title = (await formData).get("title");
      const content = (await formData).get("content");
      const created = Temporal.Now.plainDateTimeISO().toLocaleString();
      const data = {
        title,
        content,
        created,
      };
      const kv = connections.get("kv");
      if (kv) {
        const atomic = kv.atomic();
        const commit = await atomic.check({ key, versionstamp: null }).set(
          key,
          data,
        ).commit();
        if (!commit.ok) {
          throw "there was an error creating document";
        }
      }
      return Response.redirect(new URL("/documents/", url));
    },
  },
  {
    name: "library",
    method: "GET",
    pathname: "/library/",
    async handler({ render, url, headers }) {
      const title = "Library";
      const description = "This is the library...";
      const page = await render("library/index.vto");
      const body = await page({ title, description, url, nav });
      return html(body, { headers });
    },
  },
  {
    name: "library_upload",
    method: "GET",
    pathname: "/library/upload/",
    async handler({ connections, request }) {
      const connection = connections.get("sessions");
      if (!connection) throw "no session connection available!";
      const flash = await createFlash(request, connection);
      flash.set("success", "file uploaded successfully!");
      return Response.redirect(new URL("/library/", import.meta.url));
    },
  },
  {
    name: "library_upload",
    method: "POST",
    pathname: "/library/upload/",
    async handler({ request }) {
      const formData = await request.formData();
      const file: File | null = formData?.get("file") as File;
      if (!file) {
        return new Response("File required but not provided.", {
          status: 400,
        });
      }
      const tmp = await Deno.makeTempFile({
        dir: "./tmp",
      });
      await Deno.writeFile(tmp, await file.bytes());
      const fileURL = new URL(`files/${file.name}`, import.meta.url);
      await Deno.rename(tmp, fileURL);
      return Response.redirect(new URL("/library/", request.url));
    },
  },
  {
    name: "sessions",
    method: "GET",
    pathname: "/sessions/",
    async handler({ render, headers, url }) {
      const title = "Sessions";
      const key = "sessions";
      const repository = new KvRepository(key);
      const page = await render("dev/index.vto");
      const data = await repository.getAllByKey(key);
      const body = await page({ title, url, nav, data });
      return html(body, { headers });
    },
  },
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

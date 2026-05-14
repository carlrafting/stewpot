import nav from "./nav.ts";
import { createFlash } from "../flash/message.ts";
import type { Route, RouteContext } from "../http/routes.ts";
import { html } from "../http/response.ts";
import { KvRepository } from "../kv/repository.ts";
import type { DocumentData, RouteData } from "./data.ts";
import type { Session } from "../session/kv.ts";

export const routes: Route[] = [
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
      const routes: RouteData[] = [
        {
          name: "Black",
          path: "/black/",
          type: "static",
          ref: "files/black.png",
        },
      ];
      const data: { routes: RouteData[] } = { routes };
      const page = await render("routes/index.vto");
      const body = await page({ title, url, nav, data });
      return html(body, { headers });
    },
  },
  {
    name: "documents_index",
    pathname: "/documents/",
    method: "GET",
    async handler(
      { render, url, headers }: RouteContext,
    ): Promise<Response> {
      const title = "Documents";
      const description = "Edit &amp; create new documents";
      const kv = new KvRepository("kv");
      const data: { documents: DocumentData[] } = { documents: [] };
      const documents = await kv.getAllByKey<DocumentData>("documents");
      for (const document of documents) {
        data.documents.push(document?.value);
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
      { request, url, connections }: RouteContext,
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
      const atomic = kv?.atomic();
      const commit = await atomic?.check({ key, versionstamp: null }).set(
        key,
        data,
      ).commit();
      if (!commit?.ok) {
        throw "there was an error while creating the document!";
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
      const data = await repository.getAllByKey<Session>(key);
      const body = await page({ title, url, nav, data });
      return html(body, { headers });
    },
  },
];

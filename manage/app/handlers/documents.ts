import { html } from "../../http/response.ts";
import { getConnection } from "../../kv/connections.ts";
import { KvRepository } from "../../kv/repository.ts";
import type { Route, RouteContext } from "../../http/routes.ts";
import { defaultContent } from "../data.ts";
import type * as Data from "../data.ts";
import nav from "../nav.ts";
export default [
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
      const data: { documents: Data.Document[] } = { documents: [] };
      const documents = await kv.getAllByKey<Data.Document>("documents");
      for (const document of documents) {
        data.documents.push(document?.value);
      }
      const page = await render("documents/index.vto");
      const body = await page({ title, description, url, nav, data });
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
      const body = await page({ title, description, url, nav });
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
      const formData = await request.formData();
      const title = formData?.get("title")?.valueOf().toString() ?? "Untitled";
      const content = formData?.get("content")?.valueOf().toString() ?? "Empty";
      const draft = !!formData.get("draft")?.valueOf();
      const blocks: Data.Block[] = [];
      const created = Temporal.Now.plainDateTimeISO().toLocaleString();
      const updated = created;
      const data: Data.Document = {
        id,
        title,
        content,
        created,
        updated,
        draft,
        blocks,
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
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "edit_document",
    method: "GET",
    pattern: new URLPattern({ pathname: "/document/:id/edit/" }),
    async handler({ render, url, headers, connections, params }) {
      const title = "Edit Document";
      const description = "Add and edit content blocks for document";
      const connection = getConnection(connections, "kv");
      const kv = new KvRepository("kv");
      const id = params?.id;
      if (!id) throw "no id parameter found in URL!";
      const blockTypes: Data.BlockType[] = [
        "file",
        "heading",
        "markdown",
        "media",
        "text",
        "code",
      ];
      // const blocks: Data.Block[] | unknown[] = await kv.getAllByPrefix<
      //   Data.Block
      // >([
      //   "documents",
      //   id,
      //   "blocks",
      // ]);
      const blocks =
        (await kv.getAllByPrefix<Data.Block>(["documents", id, "blocks"]))
          .map((entry) => entry.value);
      const entry = await connection?.get<Data.Document>(["documents", id]);
      const document: Data.Document | undefined = {
        ...entry?.value,
      } as Data.Document;
      const page = await render("documents/edit.vto");
      const body = await page({
        title,
        description,
        url,
        nav,
        document,
        blockTypes,
        blocks,
      });
      return html(body, { headers });
    },
  },
  {
    name: "new_block",
    method: "POST",
    pattern: new URLPattern({ pathname: "/document/:id/blocks/new/" }),
    async handler({ params, url, connections, request }) {
      const id = params.id;
      if (!id) throw "no document id found in params";
      const kv = getConnection(connections, "kv");
      if (!kv) throw "no connection with that key found!";
      const formData = await request.formData();
      const type = formData.get("type") as Data.BlockType;
      const blockId = crypto.randomUUID();
      const block = {
        id: blockId,
        type,
        order: 0,
        layout: "default",
        content: defaultContent(type),
      };
      await kv?.set(["documents", id, "blocks", blockId], block);
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
] as Route[];

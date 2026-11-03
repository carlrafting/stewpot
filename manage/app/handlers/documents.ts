import { html, text } from "../../http/response.ts";
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
        throw new Error("There was an error while creating the document!");
      }
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "edit_document",
    method: "GET",
    pattern: new URLPattern({ pathname: "/document/:id/edit/" }),
    async handler({ render, url, headers, connections, params, flash }) {
      const title = "Edit Document";
      const description = "Add and edit content blocks for document";
      const connection = getConnection(connections, "kv");
      const kv = new KvRepository("kv");
      const id = params?.id;
      if (!id) return text("Document ID is required.", { status: 400 });
      const blockTypes: Data.BlockType[] = [
        "file",
        "heading",
        "markdown",
        "media",
        "text",
        "code",
      ];
      const blocks = (await kv.getAllByPrefix<Data.Block>(["blocks", id]))
        .map((entry) => entry.value);
      const entry = await connection?.get<Data.Document>(["documents", id]);
      if (!entry?.value || entry.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }
      const document = entry?.value;
      const blockAdded = await flash.get("success");
      const page = await render("documents/edit.vto");
      const body = await page({
        title,
        description,
        url,
        nav,
        document,
        blockAdded,
        blockTypes,
        blocks,
      });
      return html(body, { headers });
    },
  },
  {
    name: "update_document",
    method: "POST",
    pattern: new URLPattern({ pathname: "/document/:id/update/" }),
    async handler({ params, url, connections, request, flash }) {
      const id = params.id;
      if (!id) return text("Document ID is required.", { status: 400 });
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");

      const key = ["documents", id];
      const entry = await kv.get<Data.Document>(key);
      if (!entry.value || entry.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }

      const formData = await request.formData();
      const titleValue = formData.get("title");
      if (typeof titleValue !== "string" || !titleValue.trim()) {
        return text("A document title is required.", { status: 400 });
      }

      const document: Data.Document = {
        ...entry.value,
        title: titleValue.trim(),
        draft: formData.has("draft"),
        updated: Temporal.Now.plainDateTimeISO().toLocaleString(),
      };
      const commit = await kv.atomic().check(entry).set(key, document).commit();
      if (!commit.ok) {
        return text(
          "Document changed while it was being saved. Please retry.",
          {
            status: 409,
          },
        );
      }

      flash.set("success", "Document saved.");
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "new_block",
    method: "POST",
    pattern: new URLPattern({ pathname: "/document/:id/blocks/new/" }),
    async handler({ params, url, connections, request, flash }) {
      const id = params.id;
      if (!id) throw new Error("No document id found in URL params");
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      const formData = await request.formData();
      const type = formData.get("type");
      if (
        type !== "file" && type !== "heading" && type !== "markdown" &&
        type !== "media" && type !== "text" && type !== "code"
      ) {
        return text("Invalid block type.", { status: 400 });
      }
      const document = await kv.get<Data.Document>(["documents", id]);
      if (!document.value || document.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }
      const blockId = crypto.randomUUID();
      const block = {
        id: blockId,
        type,
        order: 0,
        layout: "default",
        content: defaultContent(type),
      };
      await kv.set(["blocks", id, blockId], block);
      flash.set("success", "created new block");
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
] as Route[];

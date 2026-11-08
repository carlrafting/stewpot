import { html, json, text } from "../../http/response.ts";
import { getConnection } from "../../kv/connections.ts";
import type { Route, RouteContext } from "../../http/routes.ts";
import {
  type Block,
  blockTypes,
  defaultContent,
  type Document,
  documentPath,
  isBlockType,
  normalizeDocumentPath,
  parseBlockContent,
  slugifyTitle,
} from "../data.ts";
import { renderMarkdown } from "../rendering.ts";
import nav from "../nav.ts";

function isJsonRequest(request: Request): boolean {
  return request.headers.get("accept")?.includes("application/json") ?? false;
}

function badRequest(message: string, request: Request): Response {
  return isJsonRequest(request)
    ? json({ error: message }, { status: 400 })
    : text(message, { status: 400 });
}

function sortBlocks(blocks: Block[]): Block[] {
  return blocks.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

function normalizeOrder(blocks: Block[]): Block[] {
  return blocks.map((block, order) => ({ ...block, order }));
}

async function findPathConflict(
  kv: Deno.Kv,
  path: string,
  excludedId?: string,
): Promise<Document | null> {
  const normalizedPath = path.toLocaleLowerCase("en-US");
  for await (const entry of kv.list<Document>({ prefix: ["documents"] })) {
    const document = entry.value;
    if (document.id === excludedId) continue;
    if (documentPath(document).toLocaleLowerCase("en-US") === normalizedPath) {
      return document;
    }
  }
  return null;
}

export default [
  {
    name: "markdown_preview",
    pathname: "/document/blocks/markdown-preview/",
    method: "POST",
    async handler({ request }): Promise<Response> {
      const formData = await request.formData();
      const body = formData.get("body");
      if (typeof body !== "string") {
        return badRequest("Markdown content is required.", request);
      }
      return json({ html: renderMarkdown(body) });
    },
  },
  {
    name: "documents_index",
    pathname: "/documents/",
    method: "GET",
    async handler(
      { render, url, headers, connections }: RouteContext,
    ): Promise<Response> {
      const title = "Documents";
      const description = "Edit &amp; create new documents";
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      const data: { documents: Document[] } = { documents: [] };
      for await (
        const document of kv.list<Document>({
          prefix: ["documents"],
        })
      ) {
        const title = typeof document.value.title === "string"
          ? document.value.title
          : "Untitled";
        data.documents.push({
          ...document.value,
          title,
          path: documentPath({ ...document.value, title }),
        });
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
      const titleValue = formData.get("title");
      const title = typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : "Untitled";
      const pathValue = formData.get("path");
      const requestedPath = typeof pathValue === "string" && pathValue.trim()
        ? pathValue.trim()
        : `/${slugifyTitle(title, id)}/`;
      const path = normalizeDocumentPath(requestedPath);
      if (!path) {
        return text("Enter a valid path such as /about/.", { status: 400 });
      }
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      if (await findPathConflict(kv, path)) {
        return text("Another document already uses this path.", {
          status: 409,
        });
      }
      const pathKey = ["documentPaths", path.toLocaleLowerCase("en-US")];
      const pathEntry = await kv.get<string>(pathKey);
      if (pathEntry.value) {
        return text("Another document already uses this path.", {
          status: 409,
        });
      }
      const content = formData?.get("content")?.valueOf().toString() ?? "Empty";
      const draft = formData.has("draft");
      const created = Temporal.Now.plainDateTimeISO().toLocaleString();
      const updated = created;
      const data: Document = {
        id,
        title,
        path,
        content,
        created,
        updated,
        draft,
      };
      const commit = await kv.atomic()
        .check({ key, versionstamp: null }, {
          key: pathKey,
          versionstamp: null,
        })
        .set(key, data)
        .set(pathKey, id)
        .commit();
      if (!commit.ok) {
        return text("Another document already uses this path.", {
          status: 409,
        });
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
      const id = params?.id;
      if (!id) return text("Document ID is required.", { status: 400 });
      if (!connection) {
        throw new Error("No connection with provided key found!");
      }
      const blockValues: Block[] = [];
      for await (
        const entry of connection.list<Block>({
          prefix: ["blocks", id],
        })
      ) {
        blockValues.push(entry.value);
      }
      const blocks = sortBlocks(blockValues);
      const entry = await connection.get<Document>(["documents", id]);
      if (!entry.value || entry.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }
      const document = {
        ...entry.value,
        path: documentPath(entry.value),
      };
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
        blocks: normalizeOrder(blocks),
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
      const entry = await kv.get<Document>(key);
      if (!entry.value || entry.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }

      const formData = await request.formData();
      const titleValue = formData.get("title");
      if (typeof titleValue !== "string" || !titleValue.trim()) {
        return text("A document title is required.", { status: 400 });
      }
      const pathValue = formData.get("path");
      const path = pathValue === null
        ? documentPath(entry.value)
        : typeof pathValue === "string"
        ? normalizeDocumentPath(pathValue.trim())
        : null;
      if (!path) {
        return text("Enter a valid path such as /about/.", { status: 400 });
      }
      if (await findPathConflict(kv, path, id)) {
        return text("Another document already uses this path.", {
          status: 409,
        });
      }

      const previousPath = documentPath(entry.value);
      const pathKey = ["documentPaths", path.toLocaleLowerCase("en-US")];
      const pathEntry = await kv.get<string>(pathKey);
      if (pathEntry.value && pathEntry.value !== id) {
        return text("Another document already uses this path.", {
          status: 409,
        });
      }

      const document: Document = {
        ...entry.value,
        title: titleValue.trim(),
        path,
        draft: formData.has("draft"),
        updated: Temporal.Now.plainDateTimeISO().toLocaleString(),
      };
      let operation = kv.atomic().check(entry);
      if (pathEntry.value) {
        operation = operation.check(pathEntry);
      } else {
        operation = operation.check({ key: pathKey, versionstamp: null });
      }
      if (!pathEntry.value) operation = operation.set(pathKey, id);

      const previousPathKey = [
        "documentPaths",
        previousPath.toLocaleLowerCase("en-US"),
      ];
      if (previousPathKey[1] !== pathKey[1]) {
        const previousPathEntry = await kv.get<string>(previousPathKey);
        if (previousPathEntry.value === id) {
          operation = operation.check(previousPathEntry).delete(
            previousPathKey,
          );
        }
      }
      const commit = await operation.set(key, document).commit();
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
      if (!isBlockType(type)) {
        return badRequest("Unknown block type.", request);
      }
      const document = await kv.get<Document>(["documents", id]);
      if (!document.value || document.value.id !== id) {
        return text("Document not found.", { status: 404 });
      }
      const existingEntries: Deno.KvEntry<Block>[] = [];
      for await (const entry of kv.list<Block>({ prefix: ["blocks", id] })) {
        existingEntries.push(entry);
      }
      const existing = sortBlocks(existingEntries.map((entry) => entry.value));
      const blockId = crypto.randomUUID();
      const order = existing.reduce(
        (maximum, block) => Math.max(maximum, block.order),
        -1,
      ) + 1;
      const block = {
        id: blockId,
        type,
        order,
        content: defaultContent(type),
      };
      const result = await kv.set(["blocks", id, blockId], block);
      if (!result.ok) {
        throw new Error("There was an error while adding a block.");
      }
      flash.set("success", "created new block");
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "update_block",
    method: "POST",
    pattern: new URLPattern({
      pathname: "/document/:id/blocks/:blockId/update/",
    }),
    async handler({ params, url, connections, request, flash }) {
      const { id, blockId } = params;
      if (!id || !blockId) throw new Error("Missing document or block id.");
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      const key = ["blocks", id, blockId];
      const entry = await kv.get<Block>(key);
      if (!entry.value || entry.value.id !== blockId) {
        return text("Block not found.", { status: 404 });
      }
      if (!isBlockType(entry.value.type)) {
        return badRequest("Stored block has an unknown type.", request);
      }
      const formData = await request.formData();
      const content = parseBlockContent(entry.value.type, formData);
      if (!content) return badRequest("Invalid block content.", request);
      const result = await kv.atomic().check(entry).set(key, {
        ...entry.value,
        content,
      }).commit();
      if (!result.ok) throw new Error("Block changed while saving.");
      flash.set("success", "saved block");
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "delete_block",
    method: "POST",
    pattern: new URLPattern({
      pathname: "/document/:id/blocks/:blockId/delete/",
    }),
    async handler({ params, url, connections, flash }) {
      const { id, blockId } = params;
      if (!id || !blockId) throw new Error("Missing document or block id.");
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      const key = ["blocks", id, blockId];
      const entry = await kv.get<Block>(key);
      if (!entry.value) return text("Block not found.", { status: 404 });
      const result = await kv.atomic().check(entry).delete(key).commit();
      if (!result.ok) throw new Error("Block changed while deleting.");
      flash.set("success", "deleted block");
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
  {
    name: "order_blocks",
    method: "POST",
    pattern: new URLPattern({ pathname: "/document/:id/blocks/order/" }),
    async handler({ params, url, connections, request }) {
      const id = params.id;
      if (!id) throw new Error("No document id found in URL params");
      const kv = getConnection(connections, "kv");
      if (!kv) throw new Error("No connection with provided key found!");
      const document = await kv.get<Document>(["documents", id]);
      if (!document.value) return text("Document not found.", { status: 404 });
      const entries: Deno.KvEntry<Block>[] = [];
      for await (
        const entry of kv.list<Block>({
          prefix: ["blocks", id],
        })
      ) {
        entries.push(entry);
      }
      const blocks = sortBlocks(entries.map((entry) => entry.value));
      const formData = await request.formData();
      const requestedIds = formData.getAll("order");
      let reordered: Block[];
      if (requestedIds.length > 0) {
        const ids = requestedIds.filter(
          (value): value is string => typeof value === "string",
        );
        if (ids.length !== blocks.length) {
          return badRequest("Invalid block order.", request);
        }
        const byId = new Map(blocks.map((block) => [block.id, block]));
        if (
          new Set(ids).size !== blocks.length ||
          ids.some((value) => !byId.has(value))
        ) return badRequest("Invalid block order.", request);
        reordered = ids.map((value) => byId.get(value)!);
      } else {
        const blockId = formData.get("blockId");
        const direction = formData.get("direction");
        if (
          typeof blockId !== "string" ||
          (direction !== "up" && direction !== "down")
        ) return badRequest("Invalid block order.", request);
        const index = blocks.findIndex((block) => block.id === blockId);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= blocks.length) {
          return badRequest(
            "Block cannot be moved in that direction.",
            request,
          );
        }
        [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
        reordered = blocks;
      }
      const normalized = normalizeOrder(reordered);
      const entriesById = new Map<string, Deno.KvEntry<Block>>(
        entries.map((entry) => [entry.value.id, entry]),
      );
      const operation = kv.atomic().check(...entries);
      for (const block of normalized) {
        const entry = entriesById.get(block.id);
        if (!entry) throw new Error("Block disappeared while ordering.");
        operation.set(entry.key, block);
      }
      const result = await operation.commit();
      if (!result.ok) throw new Error("Blocks changed while ordering.");
      if (isJsonRequest(request)) return json({ ok: true });
      return Response.redirect(new URL(`/document/${id}/edit/`, url));
    },
  },
] as Route[];

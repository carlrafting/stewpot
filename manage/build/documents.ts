import { dirname } from "@std/path/dirname";
import { join } from "@std/path/join";
import {
  type Block,
  type Document,
  documentPath,
  normalizeDocumentPath,
} from "../app/data.ts";
import { DocumentRenderError, renderDocumentPage } from "../app/rendering.ts";

/** A document cannot be represented safely in static output. */
export class DocumentBuildError extends Error {}

/** A published document with its canonical route and ordered content blocks. */
export interface PublishedDocumentPage {
  /** Source document record. */
  document: Document;
  /** Canonical route such as `/about/`. */
  path: string;
  /** Ordered content blocks used to render the page. */
  blocks: Block[];
}

function outputFile(path: string): string {
  const segments = path === "/" ? [] : path.slice(1, -1).split("/");
  return join(".", ...segments, "index.html");
}

/** Collect published documents and their blocks for a build. */
export async function collectDocumentBuildSnapshot(
  kv: Deno.Kv,
): Promise<PublishedDocumentPage[]> {
  const pages: PublishedDocumentPage[] = [];
  const paths = new Map<string, string>();

  for await (const entry of kv.list<Document>({ prefix: ["documents"] })) {
    const document = entry.value;
    if (document.draft) continue;

    let path: string;
    try {
      path = documentPath(document);
    } catch (error) {
      if (error instanceof Error) {
        throw new DocumentBuildError(error.message, { cause: error });
      }
      throw error;
    }
    const normalizedPath = normalizeDocumentPath(path);
    if (!normalizedPath) {
      throw new DocumentBuildError(
        `Document "${document.id}" has an invalid path.`,
      );
    }
    const pathKey = normalizedPath.toLocaleLowerCase("en-US");
    const conflictingDocument = paths.get(pathKey);
    if (conflictingDocument) {
      throw new DocumentBuildError(
        `Documents "${conflictingDocument}" and "${document.id}" share the path "${normalizedPath}".`,
      );
    }
    paths.set(pathKey, document.id);

    const blocks: Block[] = [];
    for await (
      const block of kv.list<Block>({ prefix: ["blocks", document.id] })
    ) {
      blocks.push(block.value);
    }
    blocks.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    pages.push({ document, path: normalizedPath, blocks });
  }

  pages.sort((a, b) => a.path.localeCompare(b.path));
  return pages;
}

/** Write static HTML pages into a caller-owned staging directory. */
export async function writeDocumentPages(
  pages: readonly PublishedDocumentPage[],
  outputDirectory: string,
): Promise<string[]> {
  const targets = new Map<string, string>();
  const files = pages.map((page) => {
    const path = normalizeDocumentPath(page.path);
    if (!path) {
      throw new DocumentBuildError(
        `Document "${page.document.id}" has an invalid path.`,
      );
    }
    const relativeFile = outputFile(path);
    const targetKey = relativeFile.toLocaleLowerCase("en-US");
    const conflict = targets.get(targetKey);
    if (conflict) {
      throw new DocumentBuildError(
        `Documents "${conflict}" and "${page.document.id}" share the path "${path}".`,
      );
    }
    targets.set(targetKey, page.document.id);
    let html: string;
    try {
      html = renderDocumentPage(page.document, page.blocks);
    } catch (error) {
      if (error instanceof DocumentRenderError) {
        throw new DocumentBuildError(
          `Document "${page.document.id}": ${error.message}`,
          { cause: error },
        );
      }
      throw error;
    }
    return {
      documentId: page.document.id,
      file: join(outputDirectory, relativeFile),
      html,
    };
  });

  const written: string[] = [];
  for (const { documentId, file, html } of files) {
    await Deno.mkdir(dirname(file), { recursive: true });
    await Deno.writeTextFile(file, html);
    written.push(documentId);
  }
  return written;
}

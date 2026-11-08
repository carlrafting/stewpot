import type { Session } from "../session/kv.ts";

export interface Nav {
  text: string;
  href: string;
}

/** All block types supported by the document editor and renderer. */
export const blockTypes = [
  "heading",
  "markdown",
  "text",
  "media",
  "file",
  "code",
] as const;

/** The supported document block types. */
export type BlockType = typeof blockTypes[number];

/** Typed content carried by a document block. */
export type BlockContent =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "markdown"; body: string }
  | { type: "text"; body: string }
  | { type: "media"; url: string; alt?: string; caption?: string }
  | { type: "file"; url: string; filename: string; size: number }
  | { type: "code"; body: string };

/** A typed, ordered content block belonging to a document. */
export type Block = {
  [Type in BlockType]: {
    id: string;
    type: Type;
    order: number;
    content: Extract<BlockContent, { type: Type }>;
  };
}[BlockType];

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" &&
    (blockTypes as readonly string[]).includes(value);
}

export function defaultContent(type: BlockType): BlockContent {
  switch (type) {
    case "heading":
      return { type, level: 2, text: "" };
    case "markdown":
      return { type, body: "" };
    case "text":
      return { type, body: "" };
    case "media":
      return { type, url: "", alt: "", caption: "" };
    case "file":
      return { type, url: "", filename: "", size: 0 };
    case "code":
      return { type, body: "" };
  }
}

function formString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function validUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseBlockContent(
  type: BlockType,
  formData: FormData,
): BlockContent | null {
  switch (type) {
    case "heading": {
      const level = formString(formData, "level");
      const text = formString(formData, "text");
      if (!level || !/^[1-6]$/.test(level) || text === null) return null;
      return { type, level: Number(level) as 1 | 2 | 3 | 4 | 5 | 6, text };
    }
    case "markdown":
    case "text":
    case "code": {
      const body = formString(formData, "body");
      return body === null ? null : { type, body };
    }
    case "media": {
      const url = formString(formData, "url");
      const alt = formString(formData, "alt");
      const caption = formString(formData, "caption");
      if (
        url === null || alt === null || caption === null || !validUrl(url)
      ) return null;
      return { type, url, alt, caption };
    }
    case "file": {
      const url = formString(formData, "url");
      const filename = formString(formData, "filename");
      const size = formString(formData, "size");
      if (
        url === null || filename === null || size === null || !validUrl(url) ||
        !/^\d+$/.test(size)
      ) return null;
      const sizeInBytes = Number(size);
      if (!Number.isSafeInteger(sizeInBytes)) return null;
      return { type, url, filename, size: sizeInBytes };
    }
  }
}

/** A Manage document and its publish metadata. */
export interface Document {
  /** Stable KV identifier. */
  id: string;
  /** Display title and generated page heading. */
  title: string;
  /** Canonical public route; legacy records may omit it. */
  path?: string;
  /** Legacy unstructured content retained for older documents. */
  content: string;
  /** Creation timestamp. */
  created: string;
  /** Last update timestamp. */
  updated: string;
  /** Draft documents are excluded from static builds. */
  draft: boolean;
}

export interface Route {
  name: string;
  path: string;
  type: "static" | "dynamic";
  ref: string;
}

export interface PageContext {
  title: string;
  description: string;
  url: URL;
  nav: Nav[];
  routes: Route[];
  data: {
    routes?: Route[];
    documents?: Document[];
    sessions?: Session[];
  };
}

export function slugifyTitle(title: string, fallback = "document"): string {
  const slug = title.normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function normalizeDocumentPath(value: string): string | null {
  if (
    !value.startsWith("/") || value.startsWith("//") ||
    value.includes("\\") || value.includes("?") || value.includes("#") ||
    value.includes("%")
  ) return null;
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) return null;
  }

  const path = value === "/" ? "/" : `${value.replace(/\/+$/, "")}/`;
  if (path === "/") return path;
  const segments = path.slice(1, -1).split("/");
  if (
    segments.some((segment) =>
      !segment || segment === "." || segment === ".." ||
      !/^[\p{L}\p{N}._~-]+$/u.test(segment)
    )
  ) return null;
  return path;
}

export function documentPath(
  document: Pick<Document, "id" | "title" | "path">,
) {
  if (document.path === undefined || document.path === "") {
    return `/${slugifyTitle(document.title, document.id)}/`;
  }
  const path = normalizeDocumentPath(document.path);
  if (!path) throw new Error(`Document "${document.id}" has an invalid path.`);
  return path;
}

export interface LibrarySource {
  id: string;
  name: string;
  path: string;
  created: number;
  updated: number;
}

export interface LibraryImport {
  url: URL;
  type: "local" | "remote";
  targetSource: string;
}

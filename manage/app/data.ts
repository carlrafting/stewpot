import type { Session } from "../session/kv.ts";

export interface Nav {
  text: string;
  href: string;
}

export type BlockType =
  | "heading"
  | "markdown"
  | "text"
  | "media"
  | "file"
  | "code";

export type BlockContent =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "markdown"; body: string }
  | { type: "text"; body: string }
  | { type: "media"; url: string; alt?: string; caption?: string }
  | { type: "file"; url: string; filename: string; size: number }
  | { type: "code"; body: string };

export interface Block {
  id: string;
  type: BlockType;
  order: number;
  content: BlockContent;
}

export function defaultContent(type: BlockType): BlockContent | undefined {
  switch (type) {
    case "heading":
      return { type, level: 2, text: "" };
    case "markdown":
      return { type, body: "" };
    case "text":
      return { type, body: "" };
    case "media":
      return { type, url: "", alt: "" };
    case "file":
      return { type, url: "", filename: "", size: 0 };
  }
}

export interface Document {
  id: string;
  title: string;
  content: string;
  blocks: Block[];
  created: string;
  updated: string;
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

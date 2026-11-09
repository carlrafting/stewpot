import { fromFileUrl } from "@std/path";
import type { Options } from "../main.ts";

export type ConnectionKey = "sessions" | "kv";

function normalizeKvPath(path: string | undefined): string | undefined {
  if (!path) return path;
  if (/^file:/i.test(path)) {
    return fromFileUrl(path);
  }
  return path;
}

async function createDirectory(meta: Pick<ImportMeta, "url">): Promise<void> {
  const recursive: boolean = true;
  const url = new URL("database", meta.url);
  await Deno.mkdir(url, { recursive });
}

export async function createConnections(options: Options) {
  const connections = new Map<ConnectionKey, Deno.Kv>();
  {
    await createDirectory(options.meta);
    const sessions = await Deno.openKv(normalizeKvPath(options?.sessions?.path));
    const kv = await Deno.openKv(normalizeKvPath(options?.kv?.path));
    connections.set("sessions" as ConnectionKey, sessions);
    connections.set("kv" as ConnectionKey, kv);
  }
  return connections;
}

export const getConnection = (connections: Map<string, Deno.Kv>, key: string) =>
  connections.has(key) ? connections.get(key) : null;

import type { Options } from "../main.ts";

export type ConnectionKey = "sessions" | "kv";

async function createDirectory(meta: ImportMeta): Promise<void> {
  const recursive: boolean = true;
  const url = new URL("database", meta.url);
  await Deno.mkdir(url, { recursive });
}

export async function createConnections(options: Options) {
  const connections = new Map<ConnectionKey, Deno.Kv>();
  {
    await createDirectory(options.meta);
    const sessions = await Deno.openKv(options?.sessions?.path);
    const kv = await Deno.openKv(options?.kv?.path);
    connections.set("sessions", sessions);
    connections.set("kv", kv);
  }
  return connections;
}

export const getConnection = (connections: Map<string, Deno.Kv>, key: string) =>
  connections.has(key) ? connections.get(key) : null;

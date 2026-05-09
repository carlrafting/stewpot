import { Options } from "../main.ts";

export async function createConnections(options: Options) {
  const connections = new Map();
  {
    const sessions = await Deno.openKv(options?.sessions?.path);
    const kv = await Deno.openKv(options?.kv?.path);
    connections.set("sessions", sessions);
    connections.set("kv", kv);
  }
  return connections;
}

import { getCookies } from "@std/http/cookie";
import { COOKIE_NAME } from "./cookie.ts";
import { SESSION_TTL_MS, type SessionData as SessionType } from "./kv.ts";
import { type ConnectionKey, getConnection } from "../kv/connections.ts";

export type SessionManager = {
  get id(): string;
  touch(): Promise<void>;
  get<T>(key: string): T | undefined;
  getAll<T>(): T | undefined;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  destroy(): Promise<void>;
};

const errors = {
  connection: "error while retrieving connection for sessions!",
  session: "could not determine session ID!",
  entry: "entry does not contain any value!",
};

export async function createSessionManager(
  request: Request,
  connections: Map<ConnectionKey, Deno.Kv>,
): Promise<SessionManager> {
  const store = getConnection(connections, "sessions");
  if (!store) throw errors.connection;
  const cookies = getCookies(request.headers);
  const sessionID = cookies[COOKIE_NAME];
  if (!sessionID) throw errors.session;
  const key = ["sessions", sessionID];
  const entry = await store.get<SessionType>(key);
  if (!entry.value) throw errors.entry;
  const persist = async (data: unknown) =>
    await store.set(key, data, { expireIn: SESSION_TTL_MS });
  return {
    get id(): string {
      return sessionID;
    },
    async touch(): Promise<void> {
      const data: SessionType = { ...entry.value, lastAccessedAt: Date.now() };
      await persist(data);
    },
    async set(key: string, value: unknown) {
      const data = { ...entry.value, [key]: value };
      await persist(data);
    },
    get<T>(key: string): T | undefined {
      const data: SessionType = entry.value;
      return data[key] as T | undefined;
    },
    getAll<T>(): T | undefined {
      const data: SessionType = entry.value;
      return data as T | undefined;
    },
    async delete(key: string) {
      const { [key]: _, ...data }: SessionType = entry.value;
      await persist(data);
    },
    async destroy() {
      await store.delete(key);
    },
  };
}

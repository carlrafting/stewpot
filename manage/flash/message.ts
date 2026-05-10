import { getCookies } from "@std/http/cookie";
import { COOKIE_NAME } from "../session/cookie.ts";
import { Session, SESSION_TTL_MS } from "../session/kv.ts";

export type FlashType = "error" | "success" | "info";

export type FlashMethods = {
  set(key: FlashType, value: string): Promise<void>;
  get(key: FlashType): Promise<string | undefined>;
};

const errors = {
  session: "could not determine session ID!",
  entry: "entry does not contain any value!",
  empty: "no flashes found in session entry!",
};

export async function createFlash(
  request: Request,
  store: Deno.Kv,
): Promise<FlashMethods> {
  const cookies = getCookies(request.headers);
  const sessionID = cookies[COOKIE_NAME];
  if (sessionID) throw errors.session;
  const key = ["sessions", sessionID];
  const entry = await store.get<Session>(key);
  if (!entry.value) throw errors.entry;
  return {
    async set(key: FlashType, value: string): Promise<void> {
      const data: Session = {
        ...entry.value,
        flash: {
          ...entry.value.flash,
          [key]: value,
        },
      };
      await store.set(["sessions", sessionID], data, {
        expireIn: SESSION_TTL_MS,
      });
    },
    async get(key: FlashType) {
      const value = entry.value.flash?.[key];
      if (!value) return;
      const flash = entry?.value?.flash ?? {};
      if (!flash) throw errors.empty;
      const { [key]: _, ...remainingFlashes } = flash;
      const updated = { ...entry.value, flash: remainingFlashes };
      await store.set(["sessions", sessionID], updated, {
        expireIn: SESSION_TTL_MS,
      });
      return value;
    },
  };
}

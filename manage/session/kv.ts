import { UserAgent } from "@std/http/user-agent";
import { duration } from "../utils.ts";

export interface Session {
  createdAt: number;
  lastAccessedAt: number;
  userAgent?: string;
  forwardedIP?: string;
  flash?: Record<string, string>;
  csrf?: string;
  [key: string]: unknown;
}

interface SessionData extends Session {}

export const SESSION_TTL_MS = duration({ hours: 1 });

export async function createSession(
  request: Request,
  store: Deno.Kv,
): Promise<string>;
export async function createSession(
  request: Request,
  store: Deno.Kv,
  data?: SessionData,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const headers = request.headers;
  const userAgent = new UserAgent(headers.get("user-agent")).ua;
  const forwardedIP = headers.get("x-forwarded-for")?.toString();
  const session: Session = {
    createdAt: now.epochMilliseconds,
    lastAccessedAt: now.epochMilliseconds,
    userAgent,
    forwardedIP,
    ...data,
  };
  // console.log(id, now);
  await store.set(["sessions", id], session, { expireIn: SESSION_TTL_MS });
  return id;
}

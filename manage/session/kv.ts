import { UserAgent } from "@std/http/user-agent";

interface Session {
  createdAt: bigint;
  lastAccessedAt: bigint;
  userAgent?: string;
  forwardedIP?: string;
  flash?: Record<string, string>;
  csrf?: string;
}

interface SessionData extends Session {}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
    createdAt: now.epochNanoseconds,
    lastAccessedAt: now.epochNanoseconds,
    userAgent,
    forwardedIP,
    ...data,
  };
  console.log(id, now);
  await store.set(["sessions", id], session, { expireIn: SESSION_TTL_MS });
  return id;
}

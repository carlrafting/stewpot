import { getCookies, setCookie } from "@std/http/cookie";
import type { Middleware, NextHandler } from "./main.ts";

/** Options for the {@linkcode session} middleware. */
export interface Options {
  /** Deno KV store that sessions are persisted in. */
  kv?: Deno.Kv;
}

type Session = {
  id: string;
  csrf: string;
  createdAt: string;
  lastSeen: string;
  expiresAt: string;
  userId?: string;
};

const SESSION_TTL = Temporal.Duration.from({ minutes: 30 });
const COOKIE_NAME = "session_id";

async function createSession(kv: Deno.Kv, userId?: string): Promise<Session> {
  const id = crypto.randomUUID();
  const csrf = crypto.randomUUID();
  const now = Temporal.Now.instant();
  const sess: Session = {
    id,
    csrf,
    createdAt: now.toString(),
    lastSeen: now.toString(),
    expiresAt: now.add(SESSION_TTL).toString(),
    userId,
  };
  await kv.set(["session", id], sess, {
    expireIn: SESSION_TTL.total("milliseconds"),
  });
  return sess;
}

async function getSession(kv: Deno.Kv, id: string): Promise<Session | null> {
  const res = await kv.get<Session>(["session", id]);
  return res.value ?? null;
}

async function touchSession(kv: Deno.Kv, session: Session): Promise<void> {
  const now = Temporal.Now.instant();
  session.lastSeen = now.toString();
  session.expiresAt = now.add(SESSION_TTL).toString();
  await kv.set(["session", session.id], session, {
    expireIn: SESSION_TTL.total("milliseconds"),
  });
}

/**
 * Rotate the session when a user authenticates: the previous session is
 * deleted and a new one is created for the given user.
 *
 * @example
 * ```ts
 * const url = new URL(req.url);
 * if (url.pathname === "/login" && req.method === "POST") {
 *   const userId = "user123";
 *   session = await rotateSession(kv, session, userId);
 * }
 * ```
 *
 * @param kv Deno.Kv instance
 * @param prevSession Previous session to rotate
 * @param userId Id for current user
 * @returns The newly created session
 */
export async function rotateSession(
  kv: Deno.Kv,
  prevSession: Session,
  userId?: string,
): Promise<Session> {
  await kv.delete(["session", prevSession.id]);
  return await createSession(kv, userId);
}

export default function session(options?: Options): Middleware {
  const kv = options?.kv || null;
  if (!kv) {
    throw new Error(
      "No access to any KV Store for sessions!",
    );
  }
  return async function sessionMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const cookies = getCookies(request.headers);
    let session: Session | null = cookies[COOKIE_NAME]
      ? await getSession(kv, cookies[COOKIE_NAME])
      : null;

    if (!session) {
      session = await createSession(kv);
    } else {
      await touchSession(kv, session);
    }

    const response = await next();
    const headers = new Headers(response.headers);

    setCookie(headers, {
      name: COOKIE_NAME,
      value: session.id,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: new Date(
        Temporal.Instant.from(session.expiresAt).epochMilliseconds,
      ),
    });

    if (!request.headers.get("upgrade")) {
      return new Response(response.body, {
        status: response.status,
        headers,
      });
    }

    return response;
  };
}

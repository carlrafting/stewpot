import { getCookies, setCookie } from "@std/http/cookie";
import { ulid } from "jsr:@std/ulid/ulid";
import type { Middleware, NextHandler } from "./main.ts";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface Options {
  url?: string | null,
  kv?: Deno.Kv,
  key?: string
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
  await kv.set(["session", id], sess, { expireIn: SESSION_TTL.total("milliseconds") });
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
  await kv.set(["session", session.id], session, { expireIn: SESSION_TTL.total("milliseconds") });
}

/**
 * 
 * Rotate session when user authenticates. 
 * 
 * @example
 * 
 * ```ts
 * const url = new URL(req.url);
 * if (url.pathname === "/login" && req.method === "POST") {
 *   const userId = "user123";
 *   session = await rotateSession(session, userId);
 * }
 * ```
 * 
 * @param kv Deno.Kv instance
 * @param prevSession Previous session to rotate
 * @param userId Id for current user
 * @returns 
 */
async function rotateSession(kv: Deno.Kv, prevSession: Session, userId?: string): Promise<Session> {
  await kv.delete(["session", prevSession.id]);
  return await createSession(kv, userId);
}

export default function session(options?: Options): Middleware {
  const kv = options?.kv || null;
  const kvKey = options?.key || 'sessions';
  if (!kv) {
    throw new Error(
      'No access to any KV Store for sessions!'
    )
  }
  return async function sessionMiddleware(request: Request, next: NextHandler): Promise<Response> {
    const cookies = getCookies(request.headers);
    let session: Session | null = cookies[COOKIE_NAME] ? await getSession(kv, cookies[COOKIE_NAME]) : null;

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
      expires: new Date(Temporal.Instant.from(session.expiresAt).epochMilliseconds),
    });
    
    /*
    const url = new URL(request.url);
    const https = url.protocol === 'https:';
    const cookies = getCookies(request.headers);
    const timestamp = Temporal.Now.instant();

    let sessionId: string | null = cookies["session_id"];
    let kvTimestamp: Temporal.Instant | null = null;
    let isNew = false;

    if (sessionId) {
      const key = [kvKey, sessionId];
      const session = await kv.get<{ timestamp: string }>(key);
      if (session?.value?.timestamp) {
        kvTimestamp = Temporal.Instant.from(session.value.timestamp);
        const diff = timestamp.epochMilliseconds - kvTimestamp.epochMilliseconds;
        if (diff > SESSION_TTL_MS) {
          sessionId = null;
        }
      } else {
        sessionId = null;
      }
    }

    if (!sessionId) {
      sessionId = ulid();
      const key = [kvKey, sessionId];
      const data = {
        timestamp: timestamp.toString(),
        ip: request.headers.get('host'),
        userAgent: request.headers.get('user-agent')
      };
      const options = { expireIn: SESSION_TTL_MS };
      const entry = await kv.set(key, data, options);
      if (entry.ok) {
        console.log({ message: "[INFO] Successfully created session entry in kv store." });
      }
      isNew = true;
    }

    const response = await next();
    const headers = new Headers(response.headers);

    if (isNew) {
      setCookie(headers, {
        name: "session_id",
        value: sessionId,
        path: "/",
        httpOnly: true,
        secure: url.hostname !== 'localhost' && https,
        sameSite: "Strict",
        maxAge: SESSION_TTL_MS / 1000,
      });
    }
    // */

    if (!request.headers.get('upgrade')) {
      return new Response(response.body, {
        status: response.status,
        headers
      });
    }

    return response;
  };
}

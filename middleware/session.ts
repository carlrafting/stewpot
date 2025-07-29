import { getCookies, setCookie } from "@std/http/cookie";
import { ulid } from "jsr:@std/ulid/ulid";
import type { Middleware, NextHandler } from "./main.ts";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface Options {
  url?: string | null,
  kv?: Deno.Kv,
  key?: string
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

    if (!request.headers.get('upgrade')) {
      return new Response(response.body, {
        status: response.status,
        headers
      });
    }

    return response;
  };
}

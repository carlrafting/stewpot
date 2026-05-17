import type { Cookie } from "@std/http/cookie";
import { getConnection } from "../kv/connections.ts";
import { duration } from "../utils.ts";

export const COOKIE_NAME = "session";

export function createSessionCookie(
  connections: Map<string, Deno.Kv>,
  request: Request,
  id: string,
): Cookie {
  const url = new URL(request.url);
  const https = url.protocol === "https:";
  const kv = getConnection(connections, "sessions");
  if (!kv) throw "could not get session kv data store!";
  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: id,
    path: "/",
    maxAge: duration({ hours: 1 }, "seconds"),
    httpOnly: true,
    sameSite: "Strict",
    secure: https,
  };
  return cookie;
}

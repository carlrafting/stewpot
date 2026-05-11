import { type Cookie, setCookie } from "@std/http/cookie";
import { createSession } from "./kv.ts";
import { getConnection } from "../kv/connections.ts";
import { duration } from "../utils.ts";

export const COOKIE_NAME = "session";

export async function createSessionCookie(
  connections: Map<string, Deno.Kv>,
  request: Request,
  headers: Headers,
) {
  const url = new URL(request.url);
  const https = url.protocol === "https:";
  const kv = getConnection(connections, "sessions");
  if (!kv) throw "could not get session kv data store!";
  const id = await createSession(
    request,
    kv,
  );
  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: id,
    path: "/",
    expires: duration({ hours: 1 }),
    httpOnly: true,
    sameSite: "Strict",
    secure: https,
  };
  setCookie(headers, cookie);
}

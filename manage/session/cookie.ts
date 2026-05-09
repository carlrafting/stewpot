import { Cookie, setCookie } from "@std/http/cookie";
import { createSession } from "./kv.ts";
import { getConnection } from "../kv/connections.ts";

const COOKIE_NAME = "session";

export async function createSessionCookie(
  connections: Map<string, Deno.Kv>,
  request: Request,
  headers: Headers,
) {
  const kv = getConnection(connections, "sessions");
  if (!kv) throw "could not get session kv data store!";
  const id = await createSession(
    request,
    kv,
  );
  const cookie: Cookie = {
    name: COOKIE_NAME,
    value: id,
  };
  setCookie(headers, cookie);
  return new Response(null, {
    headers,
  });
}

import { Cookie, setCookie } from "@std/http/cookie";
import { createSession } from "./kv.ts";

const COOKIE_NAME = "session";

export async function createSessionCookie(
  connections: { get: (arg: string) => Deno.Kv },
  request: Request,
  headers: Headers,
) {
  const id = await createSession(
    request,
    connections.get("sessions"),
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

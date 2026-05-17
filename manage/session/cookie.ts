import type { Cookie } from "@std/http/cookie";
import { duration } from "../utils.ts";

export const COOKIE_NAME = "session";

export function createSessionCookie(
  request: Request,
  id: string,
): Cookie {
  const url = new URL(request.url);
  const https = url.protocol === "https:";
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

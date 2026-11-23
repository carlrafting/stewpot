import type { Middleware, NextHandler } from "./main.ts";
import { getCookies } from "@std/http/cookie";
import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

/** Options for the {@linkcode auth} middleware. */
export interface Options {
  /** Path of the sign-in page. Requests to it are never redirected. Defaults to `/signin`. */
  signin?: string;
}

/**
 * Redirects requests without an `authenticated` cookie to the sign-in page.
 *
 * This only checks that the cookie is present, not that its value was issued by
 * the server, so it must not be relied on as real authentication.
 */
export default function auth(options?: Options): Middleware {
  const signin = options?.signin ?? "/signin";
  return async function authMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const url = new URL(request.url);
    const cookies = getCookies(request.headers);
    const allowed = cookies?.authenticated || url.pathname === signin;

    if (allowed) {
      return await next();
    }

    const status = STATUS_CODE.Found;
    const text = STATUS_TEXT[status];
    return new Response(text, {
      status,
      headers: { location: signin },
    });
  };
}

export { auth };

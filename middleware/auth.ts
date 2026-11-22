import type { Middleware, NextHandler } from "./main.ts";
import { getCookies } from "@std/http/cookie";
import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

/** Options for the {@linkcode auth} middleware. */
export interface Options {
  /**
   * Decides whether the value of the authentication cookie is valid, for
   * example by looking it up in a session store or checking a signature. It is
   * only called when the cookie is present. Requests it rejects are redirected
   * to the sign-in page.
   */
  verify: (value: string, request: Request) => boolean | Promise<boolean>;
  /** Path of the sign-in page. Requests to it are never redirected. Defaults to `/signin`. */
  signin?: string;
  /** Name of the cookie that holds the credential. Defaults to `authenticated`. */
  cookie?: string;
}

/**
 * Redirects requests that do not carry a valid authentication cookie to the
 * sign-in page.
 *
 * The middleware does not issue or validate credentials itself: `verify` decides
 * whether the cookie's value is acceptable. Use a value the server created, such
 * as a session id it can look up, never one a client could make up.
 *
 * @example
 * ```ts
 * import auth from "./auth.ts";
 *
 * const sessions = new Set<string>(); // ids issued at sign-in
 * const middleware = auth({ verify: (value) => sessions.has(value) });
 * ```
 */
export default function auth(options: Options): Middleware {
  const { verify } = options;
  const signin = options.signin ?? "/signin";
  const cookieName = options.cookie ?? "authenticated";
  return async function authMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const url = new URL(request.url);
    const value = getCookies(request.headers)[cookieName];
    const allowed = url.pathname === signin ||
      (value !== undefined && await verify(value, request));

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

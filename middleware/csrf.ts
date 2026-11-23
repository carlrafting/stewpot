import { getCookies, setCookie } from "@std/http/cookie";
import type { Middleware, NextHandler } from "./main.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Generates a random token of `length` bytes, encoded as base64. */
export function generateCSRFToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/** Tokens issued while handling a request that did not have a cookie yet. */
const issuedTokens = new WeakMap<Request, string>();

/**
 * Returns the CSRF token for a request that passed through {@linkcode csrf}, to
 * embed in a form or send to client code. On a visitor's first request the
 * token has not reached the browser yet, so it is looked up from the request
 * object itself: pass the same `Request` the middleware received.
 *
 * @returns The token, or `undefined` if the request did not pass through `csrf()`
 */
export function csrfToken(request: Request): string | undefined {
  return issuedTokens.get(request) ?? getCookies(request.headers)["csrf_token"];
}

/**
 * Reads the token a request submitted: the `x-csrf-token` header if present,
 * otherwise the `csrf_token` field of a form body. Throws if a form body cannot
 * be parsed.
 */
async function submittedToken(request: Request): Promise<string | null> {
  const header = request.headers.get("x-csrf-token");
  if (header) return header;

  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.clone().formData();
    const field = formData.get("csrf_token");
    return typeof field === "string" ? field : null;
  }

  return null;
}

/**
 * Double-submit cookie protection against cross-site request forgery.
 *
 * Every request gets a `csrf_token` cookie. Requests that can change state
 * (anything other than `GET`, `HEAD` and `OPTIONS`) must send the same value
 * back, either in an `x-csrf-token` header or in a `csrf_token` form field, or
 * they are rejected with `403`. A form body that cannot be parsed gets `400`.
 *
 * The cookie is `httpOnly`, so scripts cannot read it. Handlers that render a
 * form or page call {@linkcode csrfToken} with the request to get the value to
 * embed, including on a visitor's first request, before the cookie exists.
 */
export default function csrf(): Middleware {
  return async function csrfMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const url = new URL(request.url);
    const cookies = getCookies(request.headers);
    const existing = cookies?.["csrf_token"];

    if (!SAFE_METHODS.has(request.method.toUpperCase())) {
      let submitted: string | null;
      try {
        submitted = await submittedToken(request);
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      if (!submitted || submitted !== existing) {
        return new Response("Invalid CSRF token", { status: 403 });
      }
    }

    // Issue the token before running the handler so it can embed the value in the
    // page it renders, then send it to the browser as a cookie.
    const token = existing ?? generateCSRFToken();
    if (!existing) issuedTokens.set(request, token);

    const response = await next();

    if (!existing) {
      const https = url.protocol === "https:";
      setCookie(response.headers, {
        name: "csrf_token",
        value: token,
        httpOnly: true,
        sameSite: "Strict",
        secure: url.hostname !== "localhost" && https,
      });
    }

    return response;
  };
}

export { csrf };

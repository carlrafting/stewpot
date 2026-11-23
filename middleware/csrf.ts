import { getCookies, setCookie } from "@std/http/cookie";
import type { Middleware, NextHandler } from "./main.ts";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Generates a random token of `length` bytes, encoded as base64. */
export function generateCSRFToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
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
 * The cookie is `httpOnly`, so scripts cannot read it. Server-side code has to
 * read it from the request's cookies to render it into a page.
 */
export default function csrf(): Middleware {
  return async function csrfMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const url = new URL(request.url);
    const cookies = getCookies(request.headers);
    const csrfToken = cookies?.["csrf_token"];

    if (!SAFE_METHODS.has(request.method.toUpperCase())) {
      let submitted: string | null;
      try {
        submitted = await submittedToken(request);
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      if (!submitted || submitted !== csrfToken) {
        return new Response("Invalid CSRF token", { status: 403 });
      }
    }

    const response = await next();

    if (!csrfToken) {
      const https = url.protocol === "https:";
      const token = generateCSRFToken();
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

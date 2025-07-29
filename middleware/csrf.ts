import { getCookies, setCookie } from "@std/http/cookie";
import type { Middleware, NextHandler } from "./main.ts";

export function generateCSRFToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export default function csrf(): Middleware {
  return async function csrfMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const cookies = getCookies(request.headers);
    const csrfToken = cookies?.["csrf_token"];

    if (method === "POST") {
      const contentType = request.headers.get("content-type") ?? null;

      if (
        contentType &&
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType &&
        contentType.includes("multipart/form-data")
      ) {
        try {
          const cloned = request.clone();
          const formData = await cloned.formData();
          const submittedToken = formData.get("csrf_token");

          if (!submittedToken || submittedToken !== csrfToken) {
            return new Response("Invalid CSRF token", { status: 403 });
          }
        } catch {
          return new Response("Bad Request", { status: 400 });
        }
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

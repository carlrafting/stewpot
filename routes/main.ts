import type { Middleware, NextHandler } from "@stewpot/middleware";
import { STATUS_TEXT } from "@std/http/status";

/** Which request method the route handler should respond to */
export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

/** Request parameters passed as second argument to `RequestHandler` */
export type Params = Record<string, unknown>;

/** Route definition interface. Every definition should have these members */
interface Definition {
  method: Method;
  path: string;
  handler: (request: Request, params: Params) => Response | Promise<Response>;
}

/** Options to customize some aspects of `simpleRoutes` */
interface Options {
  normalizePath?: boolean;
  onError?: (request: Request, error: Error) => Promise<Response> | Response;
}

const defaultHeaders: HeadersInit = {
  "content-type": "text/html; charset=utf-8",
};

/** Provide type hints when defining routes */
export const defineRoutes = (definitions: Definition[]): Definition[] =>
  definitions;

/** Error response displayed for server-related errors */
export function onError(request: Request, error: Error): Response {
  const headers = new Headers(defaultHeaders);
  const status = 500;
  const html = `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${status}: ${STATUS_TEXT[status]}</title>
<h1>${STATUS_TEXT[status]}</h1>
  `;
  return new Response(html, {
    status,
    headers,
  });
}

/** Not found response displayed when no route mathches the requested URL */
export function onNotFound(request: Request): Response {
  const headers = new Headers(defaultHeaders);
  const status = 404;
  const html = `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${status}: ${STATUS_TEXT[status]}</title>
<h1>${STATUS_TEXT[status]}</h1>
    `;
  return new Response(
    html,
    {
      status,
      headers,
    },
  );
}

export const defaultOptions = {
  normalizePath: true,
  onError,
};

export const normalizePath = (path: string): string =>
  path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

/**
 * @param definitions The array containing all route definitions
 * @param options Options are passed as the second argument
 */
export function simpleRoutes(
  definitions: Definition[],
  options: Options = defaultOptions,
): Middleware {
  const routes = definitions.map(({ method, path, handler }) => ({
    method: method.toUpperCase() as Method,
    pattern: new URLPattern({ pathname: path }),
    handler,
  }));
  return async function routesMiddleware(request: Request, next: NextHandler) {
    try {
      const url = new URL(request.url);
      const pathname = options?.normalizePath
        ? normalizePath(url.pathname)
        : url.pathname;
      for (const route of routes) {
        if (request.method !== route.method) continue;
        const match = route.pattern.exec({ pathname });
        if (match) {
          const params = match?.pathname.groups ?? {};
          return await route.handler(request, params);
        }
      }
      return await next();
    } catch (error) {
      if (options.onError) {
        return await options.onError(
          request,
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      return onError(
        request,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };
}

export default simpleRoutes;

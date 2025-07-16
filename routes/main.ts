import type { Middleware, NextHandler } from "@stewpot/middleware";
import { STATUS_TEXT } from "@std/http/status";

export type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS";

type Params = Record<string, unknown>;

interface Definition {
  method: Method,
  path: string,
  handler: (request: Request, params: Params) => Response | Promise<Response>
}

interface Options {
  normalizePath: boolean,
  onError: (request: Request, error: Error) => Promise<Response> | Response,
};

const defaultHeaders: HeadersInit = {
  'content-type': 'text/html; charset=utf-8'
};

export const defineRoutes = (definitions: Definition[]): Definition[] => definitions

export function onError(request: Request, error: Error): Response {
  const headers = new Headers(defaultHeaders);
  const status = 500;
  console.log(request.url, error);
  return new Response(STATUS_TEXT[status], {
    status,
    headers
  });
}

export function onNotFound(request: Request): Response {
  const headers = new Headers(defaultHeaders)
  const status = 404;
  console.log({ status, url: request.url })
  return new Response(STATUS_TEXT[status], {
    status,
    headers
  });
}

export const defaultOptions = {
  normalizePath: true,
  onError
}

export const normalizePath = (path: string): string =>
  path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

export function simpleRoutes(definitions: Definition[], options: Options = defaultOptions): Middleware {
  const routes = definitions.map(({ method, path, handler }) => ({
    method: method.toUpperCase() as Method,
    pattern: new URLPattern({ pathname: path }),
    handler,
  }));
  return async (request: Request, next: NextHandler) => {
    try {
      const url = new URL(request.url);
      const pathname = options?.normalizePath ? normalizePath(url.pathname) : url.pathname;
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
      return await options.onError(
        request,
        (error instanceof Error ?
          error :
          new Error(String(error))
        )
      );
    }
  };
}

export default simpleRoutes;

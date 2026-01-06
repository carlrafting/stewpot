import { serveDir } from "@std/http/file-server"
import type { Middleware, NextHandler } from "./main.ts";
import { join } from "@std/path";

export interface Options {
  path?: string,
  debug?: boolean
};

export function serveStaticMiddleware(options?: Options): Middleware {
  return async function serveStatic(request: Request, next: NextHandler): Promise<Response> {
    try {
      const response = await serveDir(request, {
        fsRoot: options?.path ?? join(Deno.cwd(), "./public"),
        quiet: !options?.debug,
      });

      if (response.status === 404) {
        return await next();
      }

      return response;
    } catch (error) {
      if (options?.debug) {
        console.error(error);
      }
      throw error;
    }
  }
}

export default serveStaticMiddleware;

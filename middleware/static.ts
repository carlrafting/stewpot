import { serveDir } from "@std/http/file-server";
import type { Middleware, NextHandler } from "./main.ts";
import { join } from "@std/path";

/** Options for {@linkcode serveStaticMiddleware}. */
export interface Options {
  /** Directory to serve files from. Defaults to `./public` in the working directory. */
  path?: string;
  /** Log file-server activity and errors to the console. Defaults to `false`. */
  debug?: boolean;
}

/**
 * Serves files from a directory. Requests that do not match a file fall through
 * to the next middleware.
 */
export function serveStaticMiddleware(options?: Options): Middleware {
  return async function serveStatic(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
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
  };
}

export default serveStaticMiddleware;

import { serveDir } from "@std/http/file-server"
import type { Middleware, NextHandler } from "./main.ts";

interface Options {
  path?: string,
  debug?: boolean
};

export function serveStatic(options?: Options): Middleware {
  return async (request: Request, next: NextHandler): Promise<Response> => {
    try {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      if (pathname.includes('.')) {
        const response = serveDir(request, {
          fsRoot: options?.path || './public',
          quiet: !options?.debug,
        });
        return response;
      }
      return await next();
    } catch (error) {
      if (options?.debug) {
        console.error(error);
      }
      throw error;
    }
  }
}

export default serveStatic;

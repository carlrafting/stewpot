import type { Middleware, NextHandler } from "./main.ts";
import { getCookies } from "@std/http/cookie";
import { STATUS_TEXT, STATUS_CODE } from "@std/http/status";

interface Options {
  only: Array<Record<string, string>>
  except: Record<string, string>
  signin: string | null
}

export default function auth(options?: Options): Middleware {
  const only = options?.only;
  const except = options?.except;
  const signin = '/signin';
  return async function authMiddleware(request: Request, next: NextHandler): Promise<Response> {
    const url = new URL(request.url);
    const cookies = getCookies(request.headers);
    const allowed = cookies?.authenticated || url.pathname === signin;

    if (allowed) {
      return await next();
    }

    const status = STATUS_CODE.Found;
    const text = STATUS_TEXT[status];
    const headers = new Headers(request.headers);
    headers.set('location', signin);
    return new Response(text, {
      status,
      headers
    });
  };
}

export { auth };

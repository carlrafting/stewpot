// import { getCookies } from "./deps.js";
import * as colors from "./deps/fmt.ts";
import { errors, serveDir, serveFile } from "./deps/http.ts";
import { join } from "./deps/path.ts";
import { logNotFound } from "./stewpot.js";

export function cookies(_config = {}) {
  return function cookiesMiddleware(
    req,
    next,
  ) {
    const res = next(req);
    // const cookies = getCookies(req.headers);
    // console.log(cookies);
    return res;
  };
}

export function logger(_config = {}) {
  return async function loggerMiddleware(
    req,
    next,
  ) {
    const url = new URL(req.url);
    try {
      const res = await next(req);
      console.log(
        req.method,
        url.pathname,
        res.status >= 200 && res.status <= 299
          ? colors.green(res.status.toString())
          : res.status,
      );
      return res;
    } catch (error) {
      logNotFound(req, error, url.pathname);
      throw error; // throw error again so we can render error page
    }
  };
}

export function serveStatic({ root }) {
  return async function serveStaticMiddleware(request, next) {
    const { pathname } = new URL(request.url);

    let serveStatic = false;
    let hasFileExt = false;

    if (pathname.includes(".")) {
      hasFileExt = true;

      try {
        const file = await Deno.readFile(
          join(root, "public", pathname),
        );

        if (file) {
          serveStatic = true;
        }
      } catch (error) {
        // logNotFound(request, error, pathname);
        throw error;
      }
    }

    if (!hasFileExt && pathname !== "/") {
      try {
        const path = join(root, "public", pathname);
        const { isDirectory } = await Deno.stat(path);

        if (isDirectory) {
          serveStatic = true;
        }
      } catch (error) {
        // logNotFound(request, error, pathname);
        // throw error;
      }
    }

    if (serveStatic && hasFileExt) {
      const path = join(root, "public", pathname);
      return serveFile(request, path);
    }

    if (serveStatic && !hasFileExt) {
      const path = join(root, "public");
      return serveDir(request, {
        fsRoot: path,
        showIndex: true,
      });
    }

    return next(request);
  };
}

export function composeMiddleware({ state = {}, module = () => {} }) {
  return (
    request,
    middlewares,
    inner,
  ) => {
    if (Array.isArray(middlewares)) {
      const executeMiddlewares = (req) => {
        const mws = middlewares.reverse();
        const handlers = [];

        function next() {
          const h = handlers.shift();
          return h();
        }

        if (mws) {
          for (const mw of mws) {
            handlers.push(() => mw(req, next));
          }
        }

        handlers.push(() => inner({ request, req, next, state, module }));
        const h = handlers.shift();
        return h();
      };

      return executeMiddlewares(request);
    }

    return inner({
      request,
      state,
      module,
    });
  };
}

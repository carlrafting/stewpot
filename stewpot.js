import { serve } from "http/server.ts";
import { serveDir, serveFile } from "http/file_server.ts";
import { dirname, fromFileUrl, join } from "path/mod.ts";
export { Router } from "./lib/Router.js";

const port = 80;
const controller = new AbortController();
const IS_DEV = Deno.args.includes("--dev") && "watchFs" in Deno;

export function render(state) {
  return async (template = "index") =>
    await Deno.readTextFile(
      join(state.directory, `templates/${template}.html`),
    );
}

async function handler({ state, request, module }) {
  const { pathname } = new URL(request.url);

  let match = false;
  let hasFileExt = false;
  let useRouter = false;

  /* console.log({
    state,
    pathname,
    url: request.url,
  }); */

  // check pathname contains file extension
  if (pathname.includes(".")) {
    hasFileExt = true;
    match = true;
  }

  // if a handler is defined we only serve that handler
  if (state.handler) {
    return state.handler(request);
  }

  // continue if pathname is added route path, otherwise we'll serve public/
  if (module.router && module.router.find(request.method, request.url)) {
    useRouter = true;
  }

  // check for existing directory mathing pathname
  // otherwise return 404 Not Found
  if (!useRouter) {
    try {
      const path = join(state.directory, "public", pathname);
      const { isDirectory } = await Deno.stat(path);

      if (isDirectory) {
        match = true;
      }
    } catch (_) {
      return new Response(null, { status: 404 });
    }
  }

  if (match && hasFileExt) {
    const path = join(state.directory, "public", pathname);
    return serveFile(request, path);
  }

  if (match && !hasFileExt) {
    const path = join(state.directory, "public");
    return serveDir(request, {
      fsRoot: path,
      showIndex: true,
    });
  }

  // if module exports a router, we initialize it here...
  if (module.router) {
    try {
      return await module.router.route({
        state,
        request,
        render: render(state),
      });
    } catch (error) {
      throw error;
    }
  }
}

function errorHandler(err) {
  return new Response(`Internal Server Error! \n${err}`, {
    status: 500,
  });
}

function initializeModule(module) {
  return typeof module === "function"
    ? module()
    : module || typeof state.module === "object"
    ? Object.hasOwn(module, "default") && module.default()
    : null;
}

export default function stewpot(settings = {}) {
  const state = configureApp(IS_DEV, settings);

  const module = initializeModule(state.module);

  if (!module) {
    throw new Error('Could not initalize module, does it export a default method?');
  }

  serve(configureHandler({ state, module }), {
    port: state.port,
    signal: state.controller.signal,
    onListen(params) {
      console.log(
        `=> Started Web Server at ${params.hostname}:${params.port}!`,
      );
    },
    onError: errorHandler,
  });
}

function configureHandler({ state, module }) {
  return (request) =>
    handler({
      state,
      module,
      request,
    });
}

function configureApp(isDev, settings = {}) {
  const defaultSettings = {
    port,
    controller,
    environment: isDev ? "development" : "production",
    directory: dirname(fromFileUrl(import.meta.url)),
    module: "main.js",
  };

  return {
    ...defaultSettings,
    ...settings,
  };
}

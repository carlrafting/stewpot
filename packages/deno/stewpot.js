import {
  // dirname,
  // fromFileUrl,
  // resolve,
  join,
  serve,
  serveDir,
  serveFile,
  eta,
  colors,
} from "./deps.js";
import meta from "./stewpot.json" assert { type: "json" };
import mime from "../node/src/server/mime.js";

export { meta, mime };
export { Router } from "./lib/Router.js";

const port = 80;
const controller = new AbortController();
const IS_DEV = Deno.args.includes("--dev") && "watchFs" in Deno;

export function render(state) {
  const supportedTemplateFormats = ["html", "eta"];
  const { templateFormat } = state;

  if (!supportedTemplateFormats.includes(templateFormat)) {
    throw new Error(
      `templateFormat ${templateFormat} is not supported, try one of these instead: ${
        supportedTemplateFormats.join(", ")
      }`,
    );
  }

  async function renderFile(template, data = {}) {
    const templateDir = join(state.directory, "templates");
    const templatePath = join(
      templateDir,
      `${template}.${state.templateFormat}`,
    );

    if (templateFormat === "html") {
      template = await Deno.readTextFile(templatePath);

      if (Object.keys(data).length > 0) {
        for (const [key, value] of Object.entries(data)) {
          template = template.replaceAll(`{{ ${key} }}`, value);
        }
      }

      return template;
    }

    if (templateFormat === "eta") {
      eta.configure({
        views: templateDir,
      });

      return await eta.renderFile(`/${template}`, { ...data });
    }
  }

  return async (template = "index", { code, data, headers } = {
    code: 200,
    headers: {},
    data: {},
  }) => {
    const _template = await renderFile(template, data);

    if (_template) {
      // should render be responsible for returning reponses? probably no, should do one thing. render...
      return new Response(_template, {
        status: code,
        headers: {
          "content-type": "text/html",
          ...headers,
        },
      });
    }
  };
}

function logNotFound(error, pathname) {
  if (error instanceof Deno.errors.NotFound) {
    console.log(`${colors.red("404")} - ${pathname}`)
  }
}

async function handler({ state, request, module }) {
  const { pathname } = new URL(request.url);

  const CONTEXT = { 
    state,
    request,
    pathname,
    render: render(state),
  };

  let match = false;
  let hasFileExt = false;
  let useRouter = false;

  const handler = state.handler || module.handler;

  /* if (IS_DEV) {
    console.log({
      module,
      handler,
      state,
      pathname,
      url: request.url,
    });
  } */

  // check pathname contains file extension
  if (pathname.includes(".")) {
    hasFileExt = true;
    
    try {
      const file = await Deno.readFile(join(state.directory, "public", pathname));

      if (file) {
        match = true;      
      }
    } catch (error) {
      logNotFound(error, pathname);
    }
  }

  // continue if pathname is added route path, otherwise we'll serve public/
  if (
    module && module.router && module.router.find(request.method, request.url)
  ) {
    useRouter = true;
  }

  if (handler) {
    const initializedHandler = handler(CONTEXT);

    if (initializedHandler && Object.hasOwn(initializedHandler, "run")) {
      return (
        initializedHandler.run()
      );
    }

    if (initializedHandler && Object.hasOwn(initializedHandler, "respond")) {
      return (
        initializedHandler.respond()
      );
    }

    if (initializedHandler && typeof initializedHandler === "function") {
      return initializedHandler();
    }
  }

  // check for existing directory mathing pathname
  if (!useRouter) {
    try {
      const path = join(state.directory, "public", pathname);
      const { isDirectory } = await Deno.stat(path);

      if (isDirectory) {
        match = true;
      }
    } catch (error) {
      logNotFound(error, pathname);
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
  if (useRouter) {
    try {
      return await module.router.route(CONTEXT);
    } catch (error) {
      throw error;
    }
  }

  // if no matches, return 404 Not Found
  return new Response("404 Not Found", { status: 404 });
}

function errorHandler(err) {
  return new Response(`Internal Server Error! \n${err}`, {
    status: 500,
  });
}

function initializeModule(module) {
  if (typeof module === "function") {
    return module();
  }
  if (typeof module === "object") {
    if (Object.hasOwn(module, "default")) {
      return module.default();
    }
    if (Object.hasOwn(module, "handler")) {
      return module.handler;
    }
  }
}

export default async function stewpot(settings = {}) {
  const state = configureApp(IS_DEV, settings);

  const module = initializeModule(state.module);
  /*
  if (module === undefined || typeof module !== 'string') {
    throw new Error('Could not initalize module, does it export a default method?');
  } */

  try {
    await serve(configureHandler({ state, module }), {
      port: state.port,
      signal: state.controller.signal,
      onListen(params) {
        console.log(
          `=> Started Web Server at ${params.hostname}:${params.port}!`,
        );
      },
      onError: errorHandler,
    });
  } catch (error) {
    // await stewpot({ ...state, port: state.port++ })
    throw error;
  }
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
    // directory: dirname(fromFileUrl(import.meta.url)),
    directory: Deno.cwd(),
    module: "main.js",
    templateFormat: "html",
    meta,
  };

  return {
    ...defaultSettings,
    ...settings,
  };
}

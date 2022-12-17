import {
  // resolve,
  // dirname,
  colors,
  errors,
  // fromFileUrl,
  isHttpError,
  join,
  serve,
  serveDir,
  serveFile,
  Status,
  STATUS_TEXT,
} from "./deps.js";
import meta from "./stewpot.json" assert { type: "json" };
import mime from "../node/src/server/mime.js";
import etaPlugin from "./plugins/eta.js";
import { composeMiddleware, middlewares, } from "./middleware.ts";

export { meta, mime };
export { Router } from "./lib/Router.js";

const port = 80;
const controller = new AbortController();
const IS_DEV = Deno.args.includes("--dev") && "watchFs" in Deno;
const supportedTemplateFormats = ["html"];
const mergePlugins = true;
const root = Deno.cwd();

// console.log(IS_DEV ? 'dev mode enabled': 'dev mode disabled');

const defaultPlugins = [
  etaPlugin(),
];

const pluginInstances = new Map();

const html = {
  injectData(data, template) {
    if (Object.keys(data).length > 0) {
      for (const [key, value] of Object.entries(data)) {
        template = template.replaceAll(`{{ ${key} }}`, value);
      }
    }
    return template;
  },
  async renderFile(templateDir, template) {
    const templatePath = join(
      templateDir,
      `${template}.html`,
    );

    try {
      return template = await Deno.readTextFile(templatePath);
    } catch (error) {
      console.log(error);
    }
  },
};

export function render(state) {
  const { templateFormat, templateFormats } = state;

  const templatePlugins = [...pluginInstances.values()].filter((plugin) =>
    plugin.type === "template"
  );

  /* console.log({
    state,
    templatePlugins,
    pluginInstances,
    templateFormat,
    templateFormats,
  }); */

  if (!templateFormats.includes(templateFormat)) {
    throw new Error(
      `templateFormat ${templateFormat} is not supported, try one of these instead: ${
        templateFormats.join(", ")
      }`,
    );
  }

  function renderInline(template, format, data) {
    for (const templatePlugin of templatePlugins) {
      // console.log({templatePlugin})
      if (format === templatePlugin.templateFormat) {
        if (templatePlugin.renderInline) {
          return templatePlugin.renderInline(template, data);
        }
        if (templatePlugin.renderString) {
          return templatePlugin.renderString(template, data);
        }
      }
    }
    if (format === "html") {
      return html.injectData(data, template);
    }
  }

  async function renderFile(template, format, data = {}) {
    const templateDir = join(state.root, "templates");

    for (const templatePlugin of templatePlugins) {
      // console.log({templatePlugin})
      if (format === templatePlugin.templateFormat) {
        if (templatePlugin.renderFile) {
          return templatePlugin.renderFile(templateDir, template, data);
        }
      }
    }

    if (format === "html") {
      template = await html.renderFile(templateDir, template);
      template = html.injectData(data, template);
      return template;
    }
  }

  return async (
    template = "index",
    {
      format = templateFormat,
      inline = false,
      data = {},
    } = {},
  ) => {
    // console.log({ format, inline, data });

    const _template = !inline
      ? await renderFile(template, format, data)
      : renderInline(template, format, data);

    if (_template) {
      return _template;
    }
  };
}

export function send(body, status = 200, statusText, headers = {}) {
  return new Response(body, {
    status,
    statusText,
    headers: {
      "content-type": "text/html",
      ...headers,
    },
  });
}

function defaultHandler({ pathname, render }) {
  if (pathname === "/") {
    return async () => {
      const template = await Deno.readTextFile(
        // fromFileUrl(import.meta.resolve("./templates/index.html")),
        new URL(import.meta.resolve("./templates/index.html"))
      );
      return send(
        await render(
          template,
          {
            inline: true,
            data: {
              ...meta,
              title: "Stewpot",
            },
          },
        ),
      );
    };
  }

  if (pathname === "/styles.css") {
    return async () =>
      send(await styles(), 200, null, { "content-type": "text/css" });
  }
}

function logNotFound(error, pathname) {
  if (error instanceof Deno.errors.NotFound) {
    console.log(`${colors.red("404")} - ${pathname}`);
  }
}

function serveStatic({ root }) {
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
        logNotFound(error, pathname);
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
        logNotFound(error, pathname);
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
  }
}

async function handler({ state, /* pathname, */ /* url, */ request, module }) {
  const url = new URL(request.url);
  const { pathname } = url;

  const CONTEXT = {
    state,
    request,
    pathname,
    render: render(state),
  };

  // const { state, pathname, url, request, module } = CONTEXT;

  // redirect url pathnames like /about/ to /about
  // this means we cant define /about/ in handlers and routers
  // unless i fix it some other way, or perhaps document it
  // another option would be to make it configurable
  if (pathname.length > 1 && pathname.endsWith("/")) {
    url.pathname = pathname.slice(0, -1);
    return Response.redirect(url.href, 307);
  }

  // let serveStatic = false;
  // let hasFileExt = false;
  let useRouter = false;

  /* if (IS_DEV) {
    console.log({
      module,
      state,
      pathname,
      url: request.url,
    });
  } */

  // check pathname contains file extension
  /* if (pathname.includes(".")) {
    hasFileExt = true;

    try {
      const file = await Deno.readFile(
        join(state.root, "public", pathname),
      );

      if (file) {
        serveStatic = true;
      }
    } catch (error) {
      logNotFound(error, pathname);
    }
  } */

  // continue if pathname is added route path, otherwise we'll serve public/
  if (
    module && module.router && module.router.find(request.method, request.url)
  ) {
    useRouter = true;
  }

  // check for existing directory mathing pathname
  /* if (!useRouter && !hasFileExt && pathname !== "/") {
    try {
      const path = join(state.root, "public", pathname);
      const { isDirectory } = await Deno.stat(path);

      if (isDirectory) {
        serveStatic = true;
      }
    } catch (error) {
      logNotFound(error, pathname);
    }
  } */

  const handler = state?.handler || module?.handler ||
    (IS_DEV && !useRouter) && defaultHandler;

  /* if (serveStatic && hasFileExt) {
    const path = join(state.root, "public", pathname);
    return serveFile(request, path);
  }

  if (serveStatic && !hasFileExt) {
    const path = join(state.root, "public");
    return serveDir(request, {
      fsRoot: path,
      showIndex: true,
    });
  } */

  // if module exports a router, we initialize it here...
  if (useRouter) {
    try {
      return await module.router.route(CONTEXT);
    } catch (error) {
      throw error;
    }
  }

  if (handler) {
    const handlerInstance = await handler(CONTEXT);

    for (const method of ["run", "respond"]) {
      if (handlerInstance && Object.hasOwn(handlerInstance, method)) {
        return (
          handlerInstance[method]()
        );
      }
    }

    if (handlerInstance && typeof handlerInstance === "function") {
      return handlerInstance();
    }
  }

  // if no matches, return 404 Not Found
  // return new Response("404 Not Found", { status: 404 });
  throw new errors.NotFound(
    `Stewpot wasn't able to find any matches for ${pathname}`,
  );
}

const errorTemplate = async (err, title) =>
  `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${err.message} - ${title}</title>
<style>${await styles()}</style>
<header>
<h1>${err.message}</h1>
<h2>${title}</h2>
</header>
${
    IS_DEV
      ? `
<main>
<pre>${err.stack}</pre>
</main>
`
      : ""
  }
        `.trim();

const styles = async (path = "./templates/styles.css") =>
  await Deno.readTextFile(new URL(import.meta.resolve(path)));

async function errorHandler(err) {
  // console.log(err);
  if (isHttpError(err)) {
    if (err.status === 404) {
      return new Response(
        await errorTemplate(
          err,
          `${Status.NotFound} ${STATUS_TEXT[Status.NotFound]}`,
        ),
        {
          headers: {
            "content-type": "text/html",
          },
          status: err.status,
        },
      );
    }
    /* if (err.status === 500) {
      return new Response(
        await errorTemplate(
          err,
          `${Status.InternalServerError} ${
            STATUS_TEXT[Status.InternalServerError]
          }`,
        ),
        {
          headers: {
            "content-type": "text/html",
          },
          status: err.status,
        },
      );
    } */
  }

  return new Response(
    await errorTemplate(
      err,
      `${Status.InternalServerError} ${
        STATUS_TEXT[Status.InternalServerError]
      }`,
    ),
    {
      headers: {
        "content-type": "text/html",
      },
      status: 500,
    },
  );
}

function initializeModule(module) {
  if (typeof module === "function") {
    return module();
  }
  if (typeof module === "object") {
    if (Object.hasOwn(module, "default")) {
      return module.default();
    }
    if (Object.hasOwn(module, "main")) {
      return module.main();
    }
    if (Object.hasOwn(module, "handler")) {
      return module.handler;
    }
  }
}

export default async function stewpot(settings = {}) {
  const state = configureApp(IS_DEV, settings);

  if (state.plugins.length > 0) {
    registerPlugins({ state, settings });
  }

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
  const inner = handler;
  const respondWithMiddleware = composeMiddleware({ state, module });

  return (request) => {
    /* const url = new URL(request.url);
    const { pathname } = url;

    const CONTEXT = {
      state,
      request,
      url,
      pathname,
      render: render(state),
    }; */

    return respondWithMiddleware(request, [...middlewares, serveStatic(state)], inner)
    /* inner({
      state,
      module,
      request,
    }); */
  }
}

function registerPlugins({ state, settings }) {
  // console.log("mergePlugins", state.mergePlugins);
  if (state.mergePlugins && settings.plugins) {
    state.plugins = [
      ...defaultPlugins,
      ...settings.plugins,
    ];
  }
  // console.log("registerPlugins", state.plugins)
  for (const plugin of state.plugins) {
    if (typeof plugin === "function") {
      const pluginInstance = plugin({ state });
      pluginInstances.set(pluginInstance.name, pluginInstance);
    }
  }
}

// is this method even necessary?
function configureApp(isDev, settings = {}) {
  const defaultSettings = {
    port,
    controller,
    environment: isDev ? "development" : "production",
    // directory: dirname(fromFileUrl(import.meta.url)),
    directory: root, // TODO: deprecate config option `directory`, replace with `root`
    root,
    module: "main.js",
    templateFormat: "html",
    templateFormats: supportedTemplateFormats,
    plugins: defaultPlugins,
    mergePlugins,
    meta,
  };

  return {
    ...defaultSettings,
    ...settings,
  };
}

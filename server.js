import { serve } from "http/server.ts";
import { serveDir, serveFile } from "http/file_server.ts";
import { Router } from "./lib/Router.js";

const port = 8080;
const controller = new AbortController();

const router = new Router();

router.add("GET", "/", async () => {
  return new Response(
    `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/basic.css">
<title>/</title>
<h1>Hello /</h1>
  `.trim(),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
});

async function handler(request) {
  const { pathname } = new URL(request.url);

  let match = false;
  let hasFileExt = false;

  // console.log(pathname);

  // check pathname for specified file extensions
  for (const ext of [".css", ".js", ".html", ".png", ".jpg", ".svg"]) {
    if (pathname.endsWith(ext)) {
      hasFileExt = true;
      match = true;
      break;
    }

    // continue if pathname is /, otherwise we'll serve public/
    if (pathname === "/") {
      continue;
    }

    // check for existing directory mathing pathname
    // otherwise return 404 Not Found
    try {
      const { isDirectory } = await Deno.stat(`public${pathname}`);

      if (isDirectory) {
        match = true;
        hasFileExt = false;
        break;
      }
    } catch (error) {
      return new Response(null, {
        status: 404,
      });
    }
  }

  // console.log({ match });

  if (match && hasFileExt) {
    return serveFile(request, `public/${pathname}`);
  }

  if (match && !hasFileExt) {
    return serveDir(request, {
      fsRoot: "./public",
      showIndex: true,
    });
  }

  return await router.route(request);
}

await serve(handler, {
  port,
  signal: controller.signal,
  onListen(params) {
    console.log(`=> Started Web Server at ${params.hostname}:${params.port}!`);
  },
});

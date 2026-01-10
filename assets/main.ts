import { serveDir } from "@std/http";
import vento, { type Options as VentoOptions } from "ventojs/vento";

const staticPathPattern = new URLPattern({ pathname: "/static/*" });
const indexPage = await Deno.readTextFile("templates/index.html");
const headers = {
  "content-type": "text/html; charset=utf-8"
};

export default {
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      return new Response(indexPage, {
        headers
      });
    }

    const staticFileMatch = staticPathPattern.test(url);
    if (staticFileMatch) {
      return serveDir(req);
    }

    return Response.redirect(new URL("/", url.href), 301);
  },
} satisfies Deno.ServeDefaultExport;

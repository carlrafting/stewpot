import { serveDir } from "@std/http";
import vento, { type Options as VentoOptions } from "ventojs/vento";

const templateOptions: VentoOptions = {
  includes: "./templates",
  strict: true,
};
const templateData: Record<string, unknown> = {
  lang: "en"
};
const ventoEnvironment = vento(templateOptions);
const staticURLPrefix = "static";
const staticPathPattern = new URLPattern({ pathname: `/\\${staticURLPrefix}/*` });
const headers = {
  "content-type": "text/html; charset=utf-8"
};

export default {
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/") {
      const title = "Stewpot UI System";
      const indexPage = await ventoEnvironment.run("index.html.vto", { ...templateData, title });
      return new Response(indexPage.content, {
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

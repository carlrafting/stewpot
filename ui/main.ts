import { serveDir, STATUS_CODE } from "@std/http";
import vento, { type Options as VentoOptions } from "ventojs/vento";
import colorPalette from "./components/color/palette.json" with { type: "json" };

const templateOptions: VentoOptions = {
  includes: "./templates",
  strict: true,
};
const templateData: Record<string, unknown> = {
  lang: "en",
  colorPalette
};
const ventoEnvironment = vento(templateOptions);
// const staticURLPrefix = "components";
// const staticPathPattern = new URLPattern({ pathname: `/\\${staticURLPrefix}/*` });
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

    /* const staticFileMatch = staticPathPattern.test(url);
    if (staticFileMatch) {
      return serveDir(req, {
        showDirListing: true,
        showIndex: true,
      });
    } */

    let staticResponse = null;
    try {
      staticResponse = await serveDir(req, {
        showDirListing: true,
        showIndex: true,
      });
    } catch (err) {
      return new Response(JSON.stringify(err));
    }

    if (staticResponse !== null) {
      return staticResponse;
    }

    return Response.redirect(new URL("/", url.href), STATUS_CODE.TemporaryRedirect);
  },
} satisfies Deno.ServeDefaultExport;

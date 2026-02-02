import { serveDir, STATUS_CODE, STATUS_TEXT } from "@std/http";
import vento, { type Options as VentoOptions } from "ventojs/vento";
import colorPalette from "./components/color/palette.json" with {
  type: "json",
};

const templateOptions: VentoOptions = {
  includes: "./templates",
  strict: true,
};
const templateData: Record<string, unknown> = {
  lang: "en",
  colorPalette,
};
const ventoEnvironment = vento(templateOptions);
const staticURLPrefix = "components";
const staticPathPattern = new URLPattern({
  pathname: `/\\${staticURLPrefix}/*`,
});
const headers: HeadersInit = {
  "content-type": "text/html; charset=utf-8",
};
const { TemporaryRedirect, NotFound } = STATUS_CODE;

async function fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    const title = "Stewpot UI System";
    const indexPage = await ventoEnvironment.run("index.html.vto", {
      ...templateData,
      title,
    });
    return new Response(indexPage.content, {
      headers,
    });
  }

  let staticResponse = null;
  const staticFileMatch = staticPathPattern.test(url);
  if (staticFileMatch) {
    try {
      staticResponse = await serveDir(req, {
        showDirListing: true,
        showIndex: true,
      });
    } catch (err) {
      console.error(JSON.stringify(err));
      return new Response(JSON.stringify(err));
    }
  }

  if (staticResponse !== null) {
    return staticResponse;
  }

  return new Response(STATUS_TEXT[NotFound], {
    status: NotFound,
  });
}

export default {
  fetch,
} satisfies Deno.ServeDefaultExport;

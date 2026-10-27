import { fromFileUrl } from "@std/path/from-file-url";
import vento from "ventojs/mod.js";
import type { FsStorage, KvStorage } from "./storage.ts";
import denoConfig from "../deno.json" with { type: "json" };
import type { FeedData } from "./main.ts";

const htmlContentType = {
  "content-type": "text/html; charset=utf-8",
};
const svgContentType = {
  "content-type": "image/svg+xml; charset=utf-8",
};
const cssContentType = {
  "content-type": "text/css; charset=utf-8",
};
const jsContentType = {
  "content-type": "text/javascript; charset=utf-8",
};

export async function readAsset(
  filePath: string,
  baseUrl = import.meta.url,
  fetchAsset: typeof fetch = fetch,
): Promise<string> {
  const url = new URL(filePath, baseUrl);
  if (url.protocol === "file:") {
    return await Deno.readTextFile(url);
  }

  const response = await fetchAsset(url, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load reader asset: ${url} (${response.status})`);
  }
  return await response.text();
}

export async function app(
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<Deno.ServeDefaultExport> {
  const css = await readAsset("../assets/styles.css");
  const js = await readAsset("../assets/reader.js");
  const icon = await readAsset("../assets/rss-icon.svg");
  const templates = vento({
    includes: fromFileUrl(new URL("../templates", import.meta.url)),
    autoescape: true,
  });

  return {
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url);

      if (request.headers.get("upgrade") === "websocket") {
        const ws = Deno.upgradeWebSocket(request);
        if (ws.response && ws.socket) {
          console.info("upgraded to websockets connection!");
          ws.socket.addEventListener(
            "open",
            () => console.log("client connected!"),
          );
          ws.socket.addEventListener("message", (event) => {
            if (event.data === "ping") {
              ws.socket.send("pong");
            }
          });
          return ws.response;
        }
      }

      if (url.pathname === "/rss-icon.svg") {
        return new Response(icon, {
          headers: svgContentType,
        });
      }

      if (url.pathname === "/styles.css") {
        return new Response(css, {
          headers: cssContentType,
        });
      }

      if (url.pathname === "/reader.js") {
        return new Response(js, {
          headers: jsContentType,
        });
      }

      if (url.pathname === "/") {
        const pageFeeds = await Promise.all(
          feeds.map(async (feed) => ({
            ...feed,
            hostname: new URL(feed.url).hostname,
            items: await store.loadItems(feed.id),
          })),
        );
        const result = await templates.run("reader.html.vto", {
          title: `${denoConfig.name} - v${denoConfig.version}`,
          name: denoConfig.name,
          version: denoConfig.version,
          feeds: pageFeeds,
        });
        return new Response(result.content, {
          headers: htmlContentType,
        });
      }

      return new Response("404 Not Found", {
        status: 404,
      });
    },
  } satisfies Deno.ServeDefaultExport;
}

export default app;

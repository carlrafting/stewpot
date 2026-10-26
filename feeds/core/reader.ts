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

const fetchFile = async (filePath: string) => {
  const response = await fetch(
    new URL(filePath, import.meta.url),
    { cache: "no-cache" },
  );
  if (!response.ok) {
    throw new Error("response did not return a 200 OK status");
  }
  return await response.text();
};

export async function app(
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<Deno.ServeDefaultExport> {
  const css = await fetchFile("../assets/styles.css");
  const js = await fetchFile("../assets/reader.js");
  const icon = await fetchFile("../assets/rss-icon.svg");
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
          css: css.trim(),
          js: js.trim(),
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

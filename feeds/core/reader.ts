import vento from "ventojs/mod.js";
import { UrlLoader } from "ventojs/loaders/url.js";
import type { FsStorage, KvStorage } from "./storage.ts";
import denoConfig from "../deno.json" with { type: "json" };
import {
  ConfirmationRequiredError,
  type FeedData,
  fetchAllFeeds,
  subscribeToFeed,
  SubscriptionError,
} from "./main.ts";

export interface ReaderAuth {
  username: string;
  password: string;
}

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

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

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
  auth?: ReaderAuth,
): Promise<Deno.ServeDefaultExport> {
  const css = await fetchFile("../assets/styles.css");
  const js = await fetchFile("../assets/reader.js");
  const icon = await fetchFile("../assets/rss-icon.svg");
  const templates = vento({
    includes: new UrlLoader(new URL("../templates/", import.meta.url)),
    autoescape: true,
  });
  let expectedCredentials: string | undefined;
  if (auth) {
    const bytes = new TextEncoder().encode(`${auth.username}:${auth.password}`);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    expectedCredentials = btoa(binary);
  }

  return {
    async fetch(request: Request): Promise<Response> {
      const providedCredentials = request.headers.get("authorization")
        ?.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i)?.[1];
      if (expectedCredentials && providedCredentials !== expectedCredentials) {
        return new Response("Unauthorized", {
          status: 401,
          headers: {
            "www-authenticate": 'Basic realm="Stewpot Reader", charset="UTF-8"',
            "cache-control": "no-store",
          },
        });
      }

      const url = new URL(request.url);

      if (url.pathname === "/fetch-all") {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", {
            status: 405,
            headers: { allow: "POST" },
          });
        }

        try {
          await fetchAllFeeds(feeds, store);
          await store.saveFeeds(feeds);
          return new Response(null, { status: 204 });
        } catch (error) {
          console.error("failed to fetch all feeds", error);
          return new Response("Failed to fetch feeds", { status: 500 });
        }
      }

      if (url.pathname === "/subscribe") {
        if (request.method !== "POST") {
          return new Response("Method Not Allowed", {
            status: 405,
            headers: { allow: "POST" },
          });
        }

        const body = await request.json().catch(() => undefined) as
          | { url?: unknown; confirmedUrl?: unknown }
          | undefined;
        if (!body) {
          return jsonResponse(400, { error: "invalid JSON body" });
        }
        const confirmedUrl = typeof body.confirmedUrl === "string"
          ? body.confirmedUrl
          : undefined;

        try {
          const feed = await subscribeToFeed(
            body.url,
            feeds,
            store,
            (discovered) => {
              if (discovered.href === confirmedUrl) return true;
              throw new ConfirmationRequiredError(discovered.href);
            },
          );
          if (!feed) {
            return jsonResponse(400, { error: "subscription cancelled" });
          }
          return jsonResponse(201, { feed });
        } catch (error) {
          if (error instanceof ConfirmationRequiredError) {
            return jsonResponse(200, {
              confirmationRequired: true,
              url: error.url,
            });
          }
          if (error instanceof SubscriptionError) {
            return jsonResponse(error.status, { error: error.message });
          }
          console.error("failed to subscribe", error);
          return jsonResponse(502, { error: "failed to fetch feed" });
        }
      }

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
        const headers = new Headers(htmlContentType);
        if (auth) headers.set("cache-control", "no-store");
        return new Response(result.content, {
          headers,
        });
      }

      return new Response("404 Not Found", {
        status: 404,
      });
    },
  } satisfies Deno.ServeDefaultExport;
}

export default app;

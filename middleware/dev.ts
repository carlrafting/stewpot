import { fromFileUrl, join } from "@std/path";
import type { Middleware, NextHandler } from "./main.ts";

/** Options for {@linkcode devReload}. */
export interface Options {
  /** Files or directories to watch. Any change reloads connected browsers. */
  watchPaths: string[];
}

function injectReloadScript(html: string): string {
  let modified = false;
  const script = `
<script>
  const ws = new WebSocket('ws://' + location.host + '/reload');
  ws.onmessage = (msg) => {
    if (msg.data === 'reload') location.reload();
  };
</script>
  `;
  if (html.includes("</body>")) {
    modified = true;
    return html.replace("</body>", `${script}</body>`);
  }
  if (!modified) {
    modified = true;
    return html += script;
  }
  return html;
}

const defaultOptions: Options = {
  watchPaths: [
    join(Deno.cwd(), "./templates"),
    join(Deno.cwd(), "./public"),
  ],
};

const normalizePaths = (paths: string[]): string[] => {
  const results = [];
  for (const path of paths) {
    results.push(fromFileUrl(new URL(path, import.meta.url)));
  }
  return results;
};

/**
 * Reloads the browser when watched files change. HTML responses get a small
 * script injected that connects to `/reload` over a WebSocket. Intended for
 * development only.
 */
export default function devReload(
  options: Options = defaultOptions,
): Middleware {
  const connections = new Set<WebSocket>();

  (async () => {
    try {
      const watcher = Deno.watchFs(normalizePaths(options.watchPaths), {
        recursive: true,
      });

      for await (const event of watcher) {
        const validEvent = event.kind === "modify" || event.kind === "create" ||
          event.kind === "remove" || event.kind === "rename";
        if (validEvent) {
          for (const socket of connections) {
            socket.send("reload");
          }
        }
      }
    } catch (error) {
      throw error;
    }
  })();

  return async function devReloadMiddleware(req: Request, next: NextHandler) {
    const url = new URL(req.url);
    if (url.pathname === "/reload") {
      const { response, socket } = Deno.upgradeWebSocket(req);
      connections.add(socket);
      socket.onclose = () => connections.delete(socket);
      return response;
    }
    const response = await next();
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const original = await response.text();
      return new Response(injectReloadScript(original), {
        status: response.status,
        headers: response.headers,
      });
    }
    return response;
  };
}

export { devReload };

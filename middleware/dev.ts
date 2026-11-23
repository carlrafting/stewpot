import { fromFileUrl, join } from "@std/path";
import type { Middleware, NextHandler } from "./main.ts";

/** Options for {@linkcode devReload}. */
export interface Options {
  /** Files or directories to watch. Any change reloads connected browsers. */
  watchPaths: string[];
}

/** The middleware returned by {@linkcode devReload}. */
export interface DevReloadMiddleware extends Middleware {
  /** Stops watching files and closes any connected browsers' sockets. */
  close(): void;
}

function injectReloadScript(html: string): string {
  const script = `
<script>
  const ws = new WebSocket('ws://' + location.host + '/reload');
  ws.onmessage = (msg) => {
    if (msg.data === 'reload') location.reload();
  };
</script>
  `;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }
  return html + script;
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
 *
 * Call `close()` on the returned middleware to stop the file watcher.
 *
 * @throws If a watched path does not exist
 */
export default function devReload(
  options: Options = defaultOptions,
): DevReloadMiddleware {
  const connections = new Set<WebSocket>();
  const watcher = Deno.watchFs(normalizePaths(options.watchPaths), {
    recursive: true,
  });

  (async () => {
    try {
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
      // Closing the watcher can interrupt the pending read; that is expected.
      if (
        !(error instanceof Deno.errors.BadResource) &&
        !(error instanceof Deno.errors.Interrupted)
      ) {
        throw error;
      }
    }
  })();

  async function devReloadMiddleware(
    req: Request,
    next: NextHandler,
  ): Promise<Response> {
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
      // The injected script makes the body longer, so the original length is wrong.
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(injectReloadScript(original), {
        status: response.status,
        headers,
      });
    }
    return response;
  }

  let closed = false;
  return Object.assign(devReloadMiddleware, {
    close() {
      if (closed) return;
      closed = true;
      watcher.close();
      for (const socket of connections) {
        socket.close();
      }
      connections.clear();
    },
  });
}

export { devReload };

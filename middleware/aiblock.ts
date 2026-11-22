import type { Middleware, NextHandler } from "./main.ts";
import { UserAgent } from "@std/http";
import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

/**
 * Creates a middleware that responds with `403 Forbidden` to requests from
 * known AI crawlers. The blocklist is fetched once, when this is called.
 */
export async function aiblock(): Promise<Middleware> {
  const fetchBlocklist = await fetch(
    "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/haproxy-block-ai-bots.txt",
  );
  // Drop empty lines: `"".includes()` matches every user agent and would block all requests.
  const blocklist: string[] = (await fetchBlocklist.text())
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return function aiblockMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> | Response {
    const headers = new Headers(request.headers);
    const userAgent = new UserAgent(headers.get("user-agent") ?? "");

    for (const agent of blocklist) {
      if (userAgent.ua.includes(agent)) {
        const status = STATUS_CODE.Forbidden;
        const statusText = STATUS_TEXT[status];
        return new Response(statusText, {
          status,
          statusText,
        });
      }
    }

    return next();
  };
}

export default aiblock;

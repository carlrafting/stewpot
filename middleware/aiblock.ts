import type { Middleware, NextHandler } from "./main.ts";
import { UserAgent } from "@std/http";
import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

const BLOCKLIST_URL =
  "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/haproxy-block-ai-bots.txt";

/** Options for {@linkcode aiblock}. */
export interface Options {
  /**
   * User agent substrings to block. When given, nothing is fetched. By default
   * the ai.robots.txt blocklist is downloaded.
   */
  blocklist?: string[];
}

/** Trims entries and drops empty ones: `"".includes()` matches every user agent. */
function clean(entries: string[]): string[] {
  return entries.map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Creates a middleware that responds with `403 Forbidden` to requests from
 * known AI crawlers. Unless `options.blocklist` is given, the blocklist is
 * fetched once, when this is called.
 *
 * @throws If the blocklist cannot be fetched or the server responds with an error
 */
export async function aiblock(options?: Options): Promise<Middleware> {
  let blocklist: string[];
  if (options?.blocklist) {
    blocklist = clean(options.blocklist);
  } else {
    const response = await fetch(BLOCKLIST_URL);
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(
        `Could not fetch the AI crawler blocklist: ${response.status} ${response.statusText}`,
      );
    }
    blocklist = clean((await response.text()).split("\n"));
  }

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

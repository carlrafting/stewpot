import type { Middleware, NextHandler } from "./main.ts";
import { UserAgent } from "@std/http";
import { STATUS_CODE, STATUS_TEXT } from "@std/http/status";

interface Options {}

export function aiblock(options?: Options): Middleware {
  return async function aiblockMiddleware(
    request: Request,
    next: NextHandler,
  ): Promise<Response> {
    const fetchBlocklist = await fetch(
      "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/haproxy-block-ai-bots.txt",
    );
    const blocklist: string[] = (await fetchBlocklist.text()).split("\n");
    console.log({ blocklist });
    const headers = new Headers(request.headers);
    const userAgent = new UserAgent(headers.get("user-agent") ?? "");

    for (const agent of blocklist) {
      if (userAgent.ua.includes(agent)) {
        console.log("what!?", agent);
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

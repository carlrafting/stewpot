import { Cookie, getCookies, serveDir, setCookie, UserAgent } from "@std/http";
import type { Options as VentoOptions } from "@ventojs/vento";
import vento from "@ventojs/vento";

interface Options {
  vento: VentoOptions;
  sessions: {
    path?: string;
  };
  kv: {
    path?: string;
  };
}

const defaultOptions: Options = {
  vento: {
    includes: "templates",
  },
  sessions: {
    path: "database/sessions.db",
  },
  kv: {
    path: "database/kv.db",
  },
};

interface Session {
  createdAt: bigint;
  lastAccessedAt: bigint;
  userAgent?: string;
  forwardedIP?: string;
  flash?: Record<string, string>;
  csrf?: string;
}

interface SessionData extends Session {}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function createSession(
  request: Request,
  store: Deno.Kv,
): Promise<string>;
async function createSession(
  request: Request,
  store: Deno.Kv,
  data?: SessionData,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const headers = request.headers;
  const userAgent = new UserAgent(headers.get("user-agent")).ua;
  const forwardedIP = headers.get("x-forwarded-for")?.toString();
  const session: Session = {
    createdAt: now.epochNanoseconds,
    lastAccessedAt: now.epochNanoseconds,
    userAgent,
    forwardedIP,
    ...data,
  };
  console.log(id, now);
  await store.set(["sessions", id], session, { expireIn: SESSION_TTL_MS });
  return id;
}

async function createSessionCookie(
  connections: { get: (arg: string) => Deno.Kv },
  request: Request,
  headers: Headers,
) {
  const id = await createSession(
    request,
    connections.get("sessions"),
  );
  const cookie: Cookie = {
    name: "session",
    value: id,
  };
  setCookie(headers, cookie);
  return new Response(null, {
    headers,
  });
}

async function createConnections(options: Options) {
  const connections = new Map();
  {
    const sessions = await Deno.openKv(options?.sessions?.path);
    const kv = await Deno.openKv(options?.kv?.path);
    connections.set("sessions", sessions);
    connections.set("kv", kv);
  }
  return connections;
}

function html(body: BodyInit, headers: HeadersInit = []) {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...headers,
    },
  });
}

export async function app(_options?: Options) {
  const options = {
    ...defaultOptions,
    ..._options,
  };
  const connections = await createConnections(options);
  console.log(connections);
  const templates = vento(options.vento);
  const userPagePattern = new URLPattern({ pathname: "/users/:id" });
  const staticPathPattern = new URLPattern({ pathname: "/assets/*" });
  return {
    async fetch(request: Request) {
      const cookies = getCookies(request.headers);
      console.log(cookies);
      const headers = new Headers();
      const sessionID = cookies["session"];
      console.log(sessionID);
      const url = new URL(request.url);

      if (!sessionID) {
        await createSessionCookie(connections, request, headers);
      }

      if (url.pathname === "/") {
        const page = await templates.run("index.vto", {
          title: "Manage anything!",
        });
        return html(page.content, headers);
      }

      const userPageMatch = userPagePattern.exec(url);
      if (userPageMatch) {
        return new Response(userPageMatch.pathname.groups.id, {
          headers,
        });
      }

      if (staticPathPattern.test(url)) {
        return serveDir(request);
      }

      return new Response("Not found", { status: 404, headers });
    },
  } satisfies Deno.ServeDefaultExport;
}

export default app;

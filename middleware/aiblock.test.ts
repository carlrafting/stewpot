import { assertEquals, assertRejects } from "@std/assert";
import aiblock from "./aiblock.ts";

function request(userAgent: string): Request {
  return new Request("http://localhost/", {
    headers: { "user-agent": userAgent },
  });
}

async function withFetch(
  stub: typeof fetch,
  fn: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const neverFetch: typeof fetch = () => {
  throw new Error("fetch should not be called");
};

Deno.test("aiblock blocks user agents on a given blocklist", async () => {
  await withFetch(neverFetch, async () => {
    const middleware = await aiblock({ blocklist: ["BadBot", "OtherBot"] });

    const blocked = await middleware(
      request("Mozilla/5.0 (compatible; BadBot/1.0)"),
      () => new Response("ok"),
    );
    assertEquals(blocked.status, 403);

    const allowed = await middleware(
      request("Mozilla/5.0 Firefox/130.0"),
      () => new Response("ok"),
    );
    assertEquals(allowed.status, 200);
  });
});

Deno.test("aiblock ignores blank blocklist entries", async () => {
  await withFetch(neverFetch, async () => {
    const middleware = await aiblock({ blocklist: ["", "  ", "BadBot", "\n"] });

    const response = await middleware(
      request("Mozilla/5.0 Firefox/130.0"),
      () => new Response("ok"),
    );

    assertEquals(response.status, 200, "a blank entry must not block everyone");
  });
});

Deno.test("aiblock lets requests without a user agent through", async () => {
  await withFetch(neverFetch, async () => {
    const middleware = await aiblock({ blocklist: ["BadBot"] });

    const response = await middleware(
      new Request("http://localhost/"),
      () => new Response("ok"),
    );

    assertEquals(response.status, 200);
  });
});

Deno.test("aiblock fetches the blocklist by default", async () => {
  const requested: string[] = [];
  const stub: typeof fetch = (input) => {
    requested.push(String(input));
    return Promise.resolve(new Response("BadBot\n\nOtherBot\n"));
  };

  await withFetch(stub, async () => {
    const middleware = await aiblock();

    const blocked = await middleware(
      request("OtherBot/2.0"),
      () => new Response("ok"),
    );
    const allowed = await middleware(
      request("Mozilla/5.0 Firefox/130.0"),
      () => new Response("ok"),
    );

    assertEquals(blocked.status, 403);
    assertEquals(allowed.status, 200, "blank lines must not block everyone");
  });
  assertEquals(requested.length, 1);
  assertEquals(
    requested[0].includes("ai-robots-txt/ai.robots.txt"),
    true,
    "fetches the ai.robots.txt list",
  );
});

Deno.test("aiblock throws when the blocklist cannot be fetched", async () => {
  const stub: typeof fetch = () =>
    Promise.resolve(
      new Response("404: Not Found", { status: 404, statusText: "Not Found" }),
    );

  await withFetch(stub, async () => {
    await assertRejects(
      () => aiblock(),
      Error,
      "404 Not Found",
    );
  });
});

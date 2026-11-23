import {
  assert,
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { getSetCookies } from "@std/http/cookie";
import session, { rotateSession } from "./session.ts";

async function withKv(fn: (kv: Deno.Kv) => Promise<void>): Promise<void> {
  const kv = await Deno.openKv(":memory:");
  try {
    await fn(kv);
  } finally {
    kv.close();
  }
}

function sessionCookie(response: Response) {
  return getSetCookies(response.headers).find((c) => c.name === "session_id");
}

async function storedSessionIds(kv: Deno.Kv): Promise<string[]> {
  const ids: string[] = [];
  for await (const entry of kv.list({ prefix: ["session"] })) {
    ids.push(String(entry.key[1]));
  }
  return ids;
}

Deno.test("session requires a KV store", () => {
  assertThrows(() => session(), Error, "KV Store");
});

Deno.test("session creates a session and sets the cookie", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });

    const response = await middleware(
      new Request("https://localhost/"),
      () => new Response("ok"),
    );

    const cookie = sessionCookie(response);
    assert(cookie, "session_id cookie is set");
    assertEquals(cookie.httpOnly, true);
    assertEquals(cookie.secure, true);
    assertEquals(cookie.sameSite, "Lax");
    assertEquals(await storedSessionIds(kv), [cookie.value]);
    assertEquals(await response.text(), "ok");
  });
});

Deno.test("session reuses the session named by the cookie", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });
    const first = await middleware(
      new Request("https://localhost/"),
      () => new Response("ok"),
    );
    const id = sessionCookie(first)!.value;

    const second = await middleware(
      new Request("https://localhost/", {
        headers: { cookie: `session_id=${id}` },
      }),
      () => new Response("ok"),
    );

    assertEquals(sessionCookie(second)?.value, id);
    assertEquals(await storedSessionIds(kv), [id]);
  });
});

Deno.test("session replaces an unknown session id", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });

    const response = await middleware(
      new Request("https://localhost/", {
        headers: { cookie: "session_id=does-not-exist" },
      }),
      () => new Response("ok"),
    );

    const id = sessionCookie(response)!.value;
    assertNotEquals(id, "does-not-exist");
    assertEquals(await storedSessionIds(kv), [id]);
  });
});

Deno.test("session leaves websocket upgrade responses untouched", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });
    const upgraded = new Response("upgraded");

    const response = await middleware(
      new Request("https://localhost/", { headers: { upgrade: "websocket" } }),
      () => upgraded,
    );

    assertEquals(response, upgraded);
  });
});

Deno.test("rotateSession replaces the session and attaches the user", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });
    const first = await middleware(
      new Request("https://localhost/"),
      () => new Response("ok"),
    );
    const oldId = sessionCookie(first)!.value;
    const previous = (await kv.get<Parameters<typeof rotateSession>[1]>([
      "session",
      oldId,
    ])).value!;

    const rotated = await rotateSession(kv, previous, "user123");

    assertNotEquals(rotated.id, oldId);
    assertEquals(rotated.userId, "user123");
    assertEquals(await storedSessionIds(kv), [rotated.id]);
  });
});

Deno.test("session propagates errors from the next handler", async () => {
  await withKv(async (kv) => {
    const middleware = session({ kv });

    await assertRejects(
      async () =>
        await middleware(new Request("https://localhost/"), () => {
          throw new Error("boom");
        }),
      Error,
      "boom",
    );
  });
});

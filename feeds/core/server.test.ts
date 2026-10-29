import { assertEquals, assertThrows } from "@std/assert";
import { resolveReaderAuth, resolveReaderHostname } from "./server.ts";

Deno.test("reader hostname prioritizes explicit settings and defaults to loopback", () => {
  assertEquals(resolveReaderHostname(undefined, undefined), "127.0.0.1");
  assertEquals(resolveReaderHostname("127.0.0.1", "0.0.0.0"), "127.0.0.1");
  assertEquals(resolveReaderHostname(undefined, "localhost"), "localhost");
});

Deno.test("reader auth is required for non-loopback binds", () => {
  assertEquals(resolveReaderAuth("localhost", undefined, undefined), undefined);
  assertEquals(resolveReaderAuth("127.0.0.1", undefined, undefined), undefined);
  assertEquals(resolveReaderAuth("::1", undefined, undefined), undefined);
  assertEquals(resolveReaderAuth("0.0.0.0", "reader", "secret"), {
    username: "reader",
    password: "secret",
  });
  assertThrows(
    () => resolveReaderAuth("0.0.0.0", undefined, undefined),
    Error,
    "Non-loopback reader binding requires",
  );
  assertThrows(
    () => resolveReaderAuth("0.0.0.0", "reader", ""),
    Error,
    "Non-loopback reader binding requires",
  );
});

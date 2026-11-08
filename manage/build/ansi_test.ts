import { assertEquals } from "@std/assert";
import { createAnsiStripper } from "./ansi.ts";

Deno.test("ANSI stripper removes control sequences split across chunks", () => {
  const strip = createAnsiStripper();

  assertEquals(strip("Starting \x1b[3"), "Starting ");
  assertEquals(strip("2mLume build\x1b[0m\n"), "Lume build\n");
  assertEquals(strip("\x1b]8;;https://example.com"), "");
  assertEquals(strip("\x1b\\Output"), "Output");
});

Deno.test("ANSI stripper preserves plain text and line breaks", () => {
  const strip = createAnsiStripper();

  assertEquals(strip("First line\nSecond line\n"), "First line\nSecond line\n");
});

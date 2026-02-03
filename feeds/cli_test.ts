import { assertEquals, assertRejects } from "@std/assert";
import { CommandError, discoverFeed, main } from "@stewpot/feeds/cli";

Deno.test("feeds list exits with 0", async () => {
  const code = await main(["list"]);
  assertEquals(code, 0);
});

Deno.test("unknown subcommand throws a CommandError", async () => {
  await assertRejects(async () => main(["wat"]), CommandError);
});

Deno.test("should discover feed link on carlrafting.com", async () => {
  const result = await discoverFeed("https://carlrafting.com");
  assertEquals(result, "https://carlrafting.com/feed.xml");
});

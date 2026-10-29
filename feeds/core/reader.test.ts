import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path/join";
import { FsStorage } from "./storage.ts";
import type { FeedData } from "./main.ts";
import app from "./reader.ts";
import denoConfig from "../deno.json" with { type: "json" };

const handlerInfo: Deno.ServeHandlerInfo = {
  remoteAddr: {
    transport: "tcp",
    hostname: "127.0.0.1",
    port: 80,
  },
  completed: Promise.resolve(),
};

Deno.test("reader renders feeds and escapes feed content", async () => {
  const directory = await Deno.makeTempDir();
  try {
    const feed: FeedData = {
      id: "feed-1",
      url: "https://example.com/rss.xml",
      format: "rss",
    };
    const items = [{
      id: "item-1",
      feed: feed.id,
      title: "<script>unsafe</script>",
      url: "https://example.com/article",
      content: null,
    }];
    const itemsDirectory = join(directory, "items");
    await Deno.mkdir(itemsDirectory);
    await Deno.writeTextFile(
      join(itemsDirectory, `${feed.id}.json`),
      JSON.stringify(items),
    );

    const handler = await app(
      [feed],
      new FsStorage(join(directory, "feeds.json")),
    );
    const response = await handler.fetch(
      new Request("http://localhost/"),
      handlerInfo,
    );
    const html = await response.text();

    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "text/html; charset=utf-8",
    );
    assertStringIncludes(
      html,
      `<title>${denoConfig.name} - v${denoConfig.version}</title>`,
    );
    assertStringIncludes(html, "<h3>example.com</h3>");
    assertStringIncludes(html, 'href="/styles.css"');
    assertStringIncludes(html, 'src="/reader.js"');
    assertStringIncludes(html, 'name="fetch-all"');
    assertStringIncludes(html, 'id="toggle-theme-template"');
    assertStringIncludes(html, 'id="toggle-details-template"');
    assertStringIncludes(html, 'id="fetch-items-template"');
    assertStringIncludes(html, 'for="feed-1"');
    assertStringIncludes(html, "https://example.com/article");
    assertStringIncludes(html, "&lt;script&gt;unsafe&lt;/script&gt;");
    assertEquals(html.includes("<script>unsafe</script>"), false);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("reader serves its icon and returns 404 for unknown paths", async () => {
  const handler = await app([], new FsStorage("unused"));
  const iconResponse = await handler.fetch(
    new Request("http://localhost/rss-icon.svg"),
    handlerInfo,
  );
  const cssResponse = await handler.fetch(
    new Request("http://localhost/styles.css"),
    handlerInfo,
  );
  const jsResponse = await handler.fetch(
    new Request("http://localhost/reader.js"),
    handlerInfo,
  );
  const missingResponse = await handler.fetch(
    new Request("http://localhost/missing"),
    handlerInfo,
  );

  assertEquals(iconResponse.status, 200);
  assertEquals(
    iconResponse.headers.get("content-type"),
    "image/svg+xml; charset=utf-8",
  );
  assertStringIncludes(await iconResponse.text(), "<svg");
  assertEquals(cssResponse.status, 200);
  assertEquals(
    cssResponse.headers.get("content-type"),
    "text/css; charset=utf-8",
  );
  assertStringIncludes(
    await cssResponse.text(),
    "@layer reset, base, colors, theme, utils, scratch;",
  );
  assertEquals(jsResponse.status, 200);
  assertEquals(
    jsResponse.headers.get("content-type"),
    "text/javascript; charset=utf-8",
  );
  assertEquals(
    await jsResponse.text(),
    await Deno.readTextFile(new URL("../assets/reader.js", import.meta.url)),
  );
  assertEquals(missingResponse.status, 404);
  assertEquals(await missingResponse.text(), "404 Not Found");
});

Deno.test("reader renders feeds without cached item files", async () => {
  const feed: FeedData = {
    id: "feed-without-items",
    url: "https://example.com/rss.xml",
    format: "rss",
  };
  const directory = await Deno.makeTempDir();
  try {
    const handler = await app(
      [feed],
      new FsStorage(join(directory, "feeds.json")),
    );
    const response = await handler.fetch(
      new Request("http://localhost/"),
      handlerInfo,
    );

    const html = await response.text();
    assertEquals(response.status, 200);
    assertStringIncludes(html, "<h3>example.com</h3>");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

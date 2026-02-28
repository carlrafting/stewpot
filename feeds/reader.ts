import { html } from "@stewpot/html";
import type { Deps, Input, Options, ParsedArguments, Paths } from "./cli.ts";
import type { FeedData, FeedItem } from "./main.ts";
import type { FsStorage, KvStorage } from "./storage.ts";
import denoConfig from "./deno.json" with { type: "json" };
import type { Configuration } from "./config.ts";

interface TemplateData {
  title: string;
  body: string;
}

export async function app(
  _input: Input,
  _options: Options,
  _deps: Deps,
  _config: Configuration,
  _paths: Paths,
  args: ParsedArguments,
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<Deno.ServeDefaultExport> {
  const fetchStyles = await fetch(
    new URL("./assets/styles.css", import.meta.url),
    {
      cache: "no-cache",
    },
  );
  const fetchScripts = await fetch(
    new URL("./assets/reader.js", import.meta.url),
    {
      cache: "no-cache",
    },
  );
  const css = await fetchStyles.text();
  const js = await fetchScripts.text();
  const template = {
    header(content: string): string {
      return ["<header>", content, "</header>"].join("\n");
    },
    main(content: string): string {
      return ["<main class=flow>", content, "</main>"].join("\n");
    },
    html(data: TemplateData) {
      return `
<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css.trim()}
</style>
<script type="module">
${js.trim()}
</script>
<title>${data.title}</title>
<body class="flow">
<header>
</header>
${data.body}
  `.trim();
    },
  };
  const data = new Map();
  for (const feed of feeds) {
    const items: FeedItem[] = await store.loadItems(feed.id);
    data.set(feed.id, items);
  }
  const subscribeButton =
    `<button type="button" name="subscribe" class="primary">Subscribe</button>`;
  return {
    fetch(request: Request): Response {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        const title = `${denoConfig.name} - v${denoConfig.version}`;

        const main = template.main(
          `<h1 class="tac has-divider">Feed Sources</h1>\n
          <toggle-details>
            <button type="button" name="toggle-state" value="expand">Expand All</button>
            <button type="button" name="toggle-state" value="collapse">Collapse All</button>
          </toggle-details>
          ${
            feeds.map((feed) => {
              const hostname = `<h3>${new URL(feed.url).hostname}</h3>`;
              const items: FeedItem[] = data.get(feed.id);
              const count = `<span class="count">${items.length} items</span>`;
              return [
                '<details class="br flow">',
                '<summary class="bgcolor pi rounded">',
                hostname,
                count,
                "</summary>",
                "<ul>",
                items.map((item) =>
                  `<li><a href="${item.url}">${item.title}</a> <time>${
                    item.published ?? item.updated
                  }</time></li>`
                ).join("\n"),
                "</ul>",
                "</details>",
              ].join("\n");
            }).join("\n")
          }`,
        );
        const footer = `<footer>
          <a href="/">${denoConfig.name}</a>
          <span class="version">v${denoConfig.version}</span>
          <a href="https://jsr.io/${denoConfig.name}">JSR Package</a>
          <a href="https://github.com/carlrafting/stewpot">Github Repository</a>
        </footer>`
          .trim();
        const body = [
          main,
          footer,
        ].join("\n");
        const html = template.html({
          title,
          body,
        });
        return new Response(
          html,
          {
            headers: {
              "content-type": "text/html; charset=utf-8",
            },
          },
        );
      }
      return new Response("404 Not Found", {
        status: 404,
      });
    },
  };
}

export default app;

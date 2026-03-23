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

// console.log("reader protocol", new URL(import.meta.url).protocol);

const htmlContentType = {
  "content-type": "text/html; charset=utf-8",
};
const svgContentType = {
  "content-type": "image/svg+xml; charset=utf-8",
};
const fetchFile = async (filePath: string, options?: RequestInit) => {
  const response = await fetch(
    new URL(filePath, import.meta.url),
    {
      cache: "no-cache",
      ...options,
    },
  );
  return await response.text();
};

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
  const css = await fetchFile("./assets/styles.css");
  const js = await fetchFile("./assets/reader.js");
  const icon = await fetchFile("./assets/rss-icon.svg");
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
<html lang="en" data-theme="auto">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/rss-icon.svg" type="image/svg+xml">
<style>
${css.trim()}
</style>
<script type="module">
${js.trim()}
</script>
<title>${data.title}</title>
<body class="flow">
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

      if (url.pathname === "/rss-icon.svg") {
        try {
          return new Response(icon, {
            headers: {
              ...svgContentType,
            },
          });
        } catch (error) {
          throw error;
        }
      }

      if (url.pathname === "/") {
        const title = `${denoConfig.name} - v${denoConfig.version}`;

        const main = template.main(
          `<h1 class="tac has-divider">Feed Sources</h1>\n
          <toggle-details>
            <template>
              <button type="button" name="toggle-state" value="expand">Expand All</button>
              <button type="button" name="toggle-state" value="collapse">Collapse All</button>
            </template>
          </toggle-details>
          ${
            feeds.map((feed) => {
              const hostname = `<h3>${new URL(feed.url).hostname}</h3>`;
              const items: FeedItem[] = data.get(feed.id);
              const format =
                `<span class="br pi format">${feed?.format}</span>`;
              const count = `<span class="count">${items.length} items</span>`;
              const lastModified = feed.fetch_timestamp
                ? `<span>${feed?.fetch_timestamp}</span>`
                : "";
              return [
                '<details class="br flow">',
                '<summary class="bgcolor boc pi rounded">',
                hostname,
                format,
                count,
                lastModified,
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
          <div class="meta">
          <a href="/">${denoConfig.name}</a>
          <span class="version">v${denoConfig.version}</span>
          <a href="https://jsr.io/${denoConfig.name}">JSR Package</a>
          <a href="https://github.com/carlrafting/stewpot">Github Repository</a>
          <toggle-theme>
            <template>
              <fieldset>
                <legend><span>Theme</span></legend>
                <button type="button" name="toggle-theme" value="auto">
                  Auto
                </button>
                <button type="button" name="toggle-theme" value="light">
                  Light
                </button>
                <button type="button" name="toggle-theme" value="dark">
                  Dark
                </button>
              </fieldset>
            </template>
          </toggle-theme>
          </div>
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
              ...htmlContentType,
            },
          },
        );
      }
      return new Response("404 Not Found", {
        status: 404,
      });
    },
  } satisfies Deno.ServeDefaultExport;
}

export default app;

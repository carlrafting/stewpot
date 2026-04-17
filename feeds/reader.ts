import type { FeedData, FeedItem } from "./main.ts";
import type { FsStorage, KvStorage } from "./storage.ts";
import denoConfig from "./deno.json" with { type: "json" };

type mapTemplateOutputFn =
  & ((value: TemplateStyles, index: number, array: TemplateStyles[]) => unknown)
  & ((
    value: TemplateScripts,
    index: number,
    array: TemplateScripts[],
  ) => unknown);

interface TemplateStyles {
  inline?: string;
  media?: "screen" | "print" | "all" | string;
  href?: string | URL;
}

interface TemplateScripts {
  src: string | URL;
  inline?: string;
  type?: "module";
}

interface TemplateData {
  title: string;
  body: string;
  styles?: TemplateStyles[];
  scripts?: TemplateScripts[];
}

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

const mapStylesFn = (style: TemplateStyles) => {
  if (!style) return "";
  if (style?.inline) return `<style>${style.inline}</style>`;
  return `<link rel="stylesheet" href="${style.href}" media="${style.media}">`;
};
const mapScriptsFn = (script: TemplateScripts) => {
  if (!script) return "";
  if (script?.inline) return `<script>${script.inline}</script>`;
  return `<script type="${script.type}" src="${script.src}"></script>`;
};
const newLine = "\n";

const outputTemplateAssetsHTML = (
  input: TemplateScripts[] | TemplateStyles[] = [],
  fn: mapTemplateOutputFn,
): string => input?.map(fn)?.join(newLine) ?? "";

export async function app(
  feeds: FeedData[],
  store: FsStorage | KvStorage,
): Promise<Deno.ServeDefaultExport> {
  const css = await fetchFile("./assets/styles.css");
  const js = await fetchFile("./assets/reader.js");
  const icon = await fetchFile("./assets/rss-icon.svg");
  const template = {
    header(content: string): string {
      return ["<header>", content, "</header>"].join(newLine);
    },
    main(content: string): string {
      return ["<main class=flow>", content, "</main>"].join(newLine);
    },
    html(data: TemplateData) {
      return `
<!doctype html>
<html lang="en" data-theme="auto">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/rss-icon.svg" type="image/svg+xml">
${outputTemplateAssetsHTML(data?.styles, mapStylesFn)}
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
    async fetch(request: Request): Promise<Response> {
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

        const header = template.header(
          `<h1 class="tac has-divider">Feed Sources</h1>\n`,
        );
        const main = template.main(
          `<toggle-details>
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
                `<fetch-items></fetch-items>`,
                "</summary>",
                "<ul>",
                items.map((item) =>
                  `  <li>
    <a href="${item.url}">${item.title}</a>
    <time>${item.published ?? item.updated}</time>
  </li>`
                ).join(newLine),
                "</ul>",
                "</details>",
              ].join(newLine);
            }).join(newLine)
          }`,
        );
        const footer = `<footer>
          <div class="meta">
          <a href="/">${denoConfig.name}</a>
          <span class="version">v${denoConfig.version}</span>
          <a href="https://jsr.io/${denoConfig.name}">JSR Package</a>
          <a href="https://github.com/carlrafting/stewpot">Github Repository</a>
          <toggle-theme></toggle-theme>
          </div>
        </footer>`
          .trim();
        const templates = [
          `<template id="toggle-theme-template">
            <form>
              <fieldset>
                <label for="toggle-theme">Theme</label>
                <button id="toggle-theme" type="submit" name="toggle-theme" value="auto">
                  Auto
                </button>
              </fieldset>
            </form>
          </template>`,
          `<template id="fetch-items-template">
            <button type="button" name="feed-item-action" value="fetch">Fetch</button>
          </template>`,
        ].join(newLine);
        const body = [
          header,
          main,
          footer,
          templates,
        ].join(newLine);
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

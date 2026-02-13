import type { ParsedArguments } from "./cli.ts";
import type { FeedData, FeedItem, FilePersistence } from "./main.ts";
import denoConfig from "./deno.json" with { type: "json" };

const css = await Deno.readTextFile(
  new URL(import.meta.resolve("./assets/styles.css")),
);

interface HtmlDocument {
  doctype: "html";
  meta: {
    charset: "utf-8";
    viewport: "width=device-width, initial-scale=1.0";
  };
  title: string;
  body: string;
}

interface HtmlAttribute {
  key: string;
  value: unknown;
}

interface TemplateData {
  title: string;
  body: string;
}

const template = {
  headers: {
    "content-type": "text/html; charset=utf-8",
  },
  header(content: string): string {
    return ["<header>", content, "</header>"].join("\n");
  },
  main(content: string): string {
    return ["<main class=flow>", content, "</main>"].join("\n");
  },
  html(data: TemplateData) {
    return `
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${css.trim()}
</style>
<title>${data.title}</title>
<body class="flow">
<header>
<a href="#">${denoConfig.name}</a>
<span class="version">v${denoConfig.version}</span>
<a href="https://jsr.io/${denoConfig.name}">JSR</a>
</header>
${data.body}
  `.trim();
  },
};

export async function app(
  args: ParsedArguments,
  feeds: FeedData[],
  store: FilePersistence,
): Promise<Deno.ServeDefaultExport> {
  const data = new Map();
  for (const feed of feeds) {
    const items: FeedItem[] = await store.loadItems(feed.id);
    data.set(feed.id, items);
  }
  return {
    fetch(request: Request): Response {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        const title = `${denoConfig.name} - ${denoConfig.version}`;

        const main = template.main(`${
          feeds.map((feed) => {
            const hostname = `<h3>${new URL(feed.url).hostname}</h3>`;
            const items: FeedItem[] = data.get(feed.id);
            const count = `<span class="count">${items.length} items</span>`;
            return [
              "<details>",
              '<summary class="bgcolor pi">',
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
        }`);
        const footer = `<footer></footer>`
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
            headers: template.headers,
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

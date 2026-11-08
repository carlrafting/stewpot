import MarkdownIt from "markdown-it";
import type { Block, Document } from "./data.ts";

const markdown = new MarkdownIt({ html: false, linkify: false });

export class DocumentRenderError extends Error {}

export function renderMarkdown(body: string): string {
  return markdown.render(body);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!);
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function renderDocumentBlocks(blocks: Block[]): string {
  return [...blocks]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const level = Math.min(6, Math.max(1, block.content.level));
          return `<h${level}>${escapeHtml(block.content.text)}</h${level}>`;
        }
        case "markdown":
          return renderMarkdown(block.content.body);
        case "text":
          return `<p>${
            escapeHtml(block.content.body).replace(/\r?\n/g, "<br>\n")
          }</p>`;
        case "media": {
          const url = safeHttpUrl(block.content.url);
          if (!url) {
            throw new DocumentRenderError(
              `Block "${block.id}" has an invalid media URL.`,
            );
          }
          const image = `<img src="${escapeHtml(url)}" alt="${
            escapeHtml(block.content.alt ?? "")
          }">`;
          const caption = block.content.caption
            ? `<figcaption>${escapeHtml(block.content.caption)}</figcaption>`
            : "";
          return `<figure>${image}${caption}</figure>`;
        }
        case "file": {
          const url = safeHttpUrl(block.content.url);
          if (!url) {
            throw new DocumentRenderError(
              `Block "${block.id}" has an invalid file URL.`,
            );
          }
          return `<p><a href="${escapeHtml(url)}">${
            escapeHtml(block.content.filename)
          }</a></p>`;
        }
        case "code":
          return `<pre><code>${escapeHtml(block.content.body)}</code></pre>`;
        default:
          throw new DocumentRenderError(
            "Document contains an unsupported block type.",
          );
      }
    })
    .join("\n");
}

export function renderDocumentPage(
  document: Document,
  blocks: Block[],
): string {
  const content = blocks.length
    ? renderDocumentBlocks(blocks)
    : document.content && document.content !== "Empty"
    ? renderMarkdown(document.content)
    : "";
  const title = escapeHtml(document.title);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
  <main>
    <article>
      <h1>${title}</h1>
      ${content}
    </article>
  </main>
</body>
</html>
`;
}

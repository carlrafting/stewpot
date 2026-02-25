import { escape as e } from "@std/html";

/*

this might be a very stupid idea...

interface HtmlElement {
  attributes?: HtmlAttributes;
  children?: string[];
}

interface HtmlDocument {
  doctype: "html";
  lang?: string;
  meta: {
    charset: "utf-8";
    viewport: "width=device-width, initial-scale=1.0";
  };
  title: string;
  html?: HtmlElement;
  body?: HtmlElement;
}
*/

/**
 * @param document the html document to create
 * @returns array of html strings
 */
// export function buildHtmlDocument(document: HtmlDocument) {
//   const output = [];
//   const keys = Object.keys(document);
//   const values = Object.values(document);
//   const entries = Object.entries(document);
//   // console.log({ entries });
//   for (const [key, value] of entries) {
//     if (document.doctype === value) {
//       output.push(`<!${key} ${value}>`);
//       continue;
//     }
//     if (document.meta === value) {
//       for (const [name, val] of Object.entries(document.meta)) {
//         output.push(`<${key} ${name}="${val}">`);
//       }
//     }
//     let lang: string | null = null;
//     if (document.lang === value) {
//       lang = value;
//       continue;
//     }
//     if (document.html === value) {
//       output.push(`<${key} ${lang ? `lang=${lang}` : ""}>`);
//     }
//     if (document.body?.children && document.body?.children?.length > 0) {
//       output.push("<body>");
//       for (const element of document.body.children) {
//         output.push(element);
//       }
//     }
//   }
//   return output;
// }

/**
 * Interface for HTML Attributes
 */
export interface HtmlAttributes {
  /** attribute key and value */
  [key: string]: string | boolean;
}

/**
 * function that creates a html string
 *
 * @param element string value
 * @param attributes object of HtmlAttributes for element
 * @param content for element
 * @param newLine if html string should contain new lines
 * @param selfClose boolean value representing if element should be self-closing
 * @returns string with html contents
 */
export function html(
  element: string,
  attributes: HtmlAttributes,
  content: string | null,
  newLine: boolean = true,
  selfClose: boolean = false,
  escape: boolean = false,
): string {
  const attrs = Object.entries(attributes).map(([key, value]) =>
    `${key}="${value}"`
  );
  if (selfClose) {
    return [
      `<${element} ${attrs}>`,
    ].join(newLine ? "\n" : "");
  }
  return [
    `<${element} ${attrs}>`,
    escape && content ? e(content) : content,
    `</${element}>`,
  ].join(newLine ? "\n" : "");
}

interface HtmlDocument {
  doctype: "html";
  meta: {
    charset: "utf-8";
    viewport: "width=device-width, initial-scale=1.0";
  };
  title: string;
  body: string;
}

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
    content,
    `</${element}>`,
  ].join(newLine ? "\n" : "");
}

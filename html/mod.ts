import { escape as e } from "@std/html";

/** data to be mapped for template */
export type Data = Record<string, unknown>;

/** the function type returned by {@linkcode template} */
export type TaggedTemplateFunction = (
  html: TemplateStringsArray,
  ...keys: symbol[]
) => string;

/** result type returned by {@linkcode template} */
export type TemplateResult<T extends Data> = [
  {
    [K in keyof T]: symbol;
  },
  TaggedTemplateFunction,
];

/**
 * Create template strings with provided data
 *
 * @param input data to provide to template
 * @returns data and a tagged template function
 *
 * @example
 *
 * ```ts
 *
 *  const [data, t] = template({ src: "/img.jpg", alt: "alt text for images are important!" });
 *  const img = t`<img src="${data.src}" alt="${data.alt}">`;
 *
 * ```
 */
export function template<T extends Data>(
  input: T,
): TemplateResult<T> {
  const symbolMap = new Map<symbol, keyof T>();

  const data = Object.fromEntries(
    Object.keys(input).map((key) => {
      const sym = Symbol(key);
      symbolMap.set(sym, key);
      return [key, sym];
    }),
  ) as { [K in keyof T]: symbol };

  const t = (html: TemplateStringsArray, ...keys: symbol[]): string => {
    return html.reduce((output, part, i): string => {
      const sym = keys[i - 1];
      const key = symbolMap.get(sym);
      if (key === undefined) {
        throw new Error(`Unknown symbol at position ${i - 1}`);
      }
      const value = input[key];
      if (value === undefined) {
        throw new Error(
          `Missing key "${String(key)}" in data. Received keys: [${Object.keys(input).join(", ")
          }]`,
        );
      }
      return output + value + part;
    });
  };

  return [data, t];
}

/**
 * Interface for HTML Attributes
 */
export interface HtmlAttributes {
  /** attribute key and value */
  [key: string]: string | boolean;
}

/** options for {@linkcode html} */
export interface Options {
  /** add newlines */
  newLine?: boolean;
  /** self closing element */
  selfClose?: boolean;
  /** escape children */
  escape?: boolean;
}

/**
 * function that creates a html string
 *
 * @param element string value
 * @param attributes object of HtmlAttributes for element
 * @param children for element
 * @param options.newLine if html string should contain new lines
 * @param options.selfClose boolean value representing if element should be self-closing
 * @param options.escape html escape children
 * @returns string with html contents
 * 
 * @example
 * 
 * ```
 *  import { html } from "@stewpot/html";
 * 
 *  const header = html("header", { class: "banner" }) // => <header class="banner"></header>
 * ```
 */
export function html(
  element: string,
  attributes: HtmlAttributes,
  children?: string[],
  options: Options = {
    newLine: true,
    selfClose: false,
    escape: false,
  }
): string {
  const attrs = Object.entries(attributes).map(([key, value]) =>
    `${key}="${value}"`
  );
  const joinWithNewline = options.newLine ? "\n" : "";
  if (options.selfClose && !children) {
    return [
      `<${element} ${attrs}>`,
    ].join(joinWithNewline);
  }
  const elementHtmlArray = [
    `<${element} ${attrs}>`,
    undefined,
    `</${element}>`,
  ];
  if (children) {
    const childrenHtmlString: string = children?.join(joinWithNewline);
    elementHtmlArray[1] = options.escape && children
      ? e(childrenHtmlString)
      : childrenHtmlString;
    return elementHtmlArray.join(joinWithNewline);
  }
  elementHtmlArray.splice(1);
  return elementHtmlArray.join(joinWithNewline);
}

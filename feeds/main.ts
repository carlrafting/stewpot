import * as colors from "@std/fmt/colors";

export function parseSubscribeInputToURL(input: string): URL | undefined {
  if (!input.startsWith("http://") && !input.startsWith("https://")) {
    input = `https://${input}`;
  }
  try {
    return new URL(input);
  } catch (_error) {
    console.error(colors.red("error"), "invalid URL format!");
  }
}

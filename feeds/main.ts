import * as colors from "@std/fmt/colors";

export function parseURL(input: string): URL | undefined {
  try {
    return new URL(input);
  } catch (_error) {
    console.error(colors.red("error"), "invalid URL format!");
  }
}

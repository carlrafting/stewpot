/** Creates a streaming filter that removes ANSI control sequences. */
export function createAnsiStripper(): (chunk: string) => string {
  let state:
    | "text"
    | "escape"
    | "escape-intermediate"
    | "csi"
    | "control-string"
    | "control-string-escape" = "text";

  return (chunk) => {
    const output: string[] = [];
    for (const char of chunk) {
      switch (state) {
        case "text":
          if (char === "\x1b") state = "escape";
          else if (char === "\u009b") state = "csi";
          else if (
            char === "\u0090" || char === "\u0098" || char === "\u009d" ||
            char === "\u009e" || char === "\u009f"
          ) {
            state = "control-string";
          } else output.push(char);
          break;
        case "escape":
          if (char === "[") state = "csi";
          else if (
            char === "]" || char === "P" || char === "X" || char === "^" ||
            char === "_"
          ) {
            state = "control-string";
          } else if (char.charCodeAt(0) >= 0x20 && char.charCodeAt(0) <= 0x2f) {
            state = "escape-intermediate";
          } else if (char !== "\x1b") state = "text";
          break;
        case "escape-intermediate":
          if (char.charCodeAt(0) < 0x20 || char.charCodeAt(0) > 0x2f) {
            state = char === "\x1b" ? "escape" : "text";
          }
          break;
        case "csi":
          if (char.charCodeAt(0) >= 0x40 && char.charCodeAt(0) <= 0x7e) {
            state = "text";
          } else if (char === "\x1b") state = "escape";
          break;
        case "control-string":
          if (char === "\x07" || char === "\u009c") state = "text";
          else if (char === "\x1b") state = "control-string-escape";
          break;
        case "control-string-escape":
          if (char === "\\") state = "text";
          else if (char !== "\x1b") state = "control-string";
          break;
      }
    }
    return output.join("");
  };
}

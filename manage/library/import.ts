import type { LibraryImport } from "../app/data.ts";

export class Import implements LibraryImport {
  #url: URL;
  #type: "local" | "remote";
  #targetSource: string;

  constructor(url: URL, id: string) {
    this.#url = url;
    this.#type = url.protocol === "file:" ? "local" : "remote";
    this.#targetSource = id;
  }

  get url(): URL {
    return this.#url;
  }

  get type(): "local" | "remote" {
    return this.#type;
  }

  get targetSource(): string {
    return this.#targetSource;
  }
}

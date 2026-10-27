import type { LibrarySource } from "../app/data.ts";

export class Library implements LibrarySource {
  #name: string;
  #id: string;
  #path: string;
  #created: number;
  #updated: number;

  constructor(name: string) {
    this.#id = crypto.randomUUID();
    this.#name = name;
    this.#path = `libraries/${name}`;
    this.#created = Temporal.Now.instant().epochMilliseconds;
    this.#updated = Temporal.Now.instant().epochMilliseconds;
  }
  get name(): string {
    return this.#name;
  }
  get id(): string {
    return this.#id;
  }
  get path(): string {
    return this.#path;
  }

  get updated() {
    return this.#updated;
  }

  update(name: string, path: string = this.#path) {
    this.#name = name;
    this.#path = path;
    this.#updated = Temporal.Now.instant().epochMilliseconds;
  }

  get created(): number {
    return this.#created;
  }
}

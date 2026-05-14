export class KvRepository {
  #connection: Deno.Kv | null = null;

  static #connections: Map<string, Deno.Kv> = new Map();

  static set connections(connections: Map<string, Deno.Kv>) {
    this.#connections = connections;
  }

  constructor(key: string) {
    const connection = KvRepository.#connections.has(key)
      ? KvRepository.#connections.get(key)
      : null;
    if (!connection) throw `no connection with key: "${key}" exists!`;
    this.#connection = connection;
  }

  async getAllByKey<T>(
    key: string,
  ): Promise<Deno.KvEntry<T>[]> {
    const prefix = [key];
    const results = this.#connection?.list<T>({
      prefix,
    });
    const data = [];
    if (results) {
      for await (const { key, value, versionstamp } of results) {
        data.push({ key, value, versionstamp });
      }
    }
    return data;
  }
}

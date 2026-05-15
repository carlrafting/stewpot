import { type ConnectionKey, getConnection } from "./connections.ts";

export class KvRepository {
  #connection: Deno.Kv | null = null;

  static #connections: Map<ConnectionKey, Deno.Kv> = new Map();

  static set connections(connections: Map<ConnectionKey, Deno.Kv>) {
    this.#connections = connections;
  }

  constructor(key: ConnectionKey) {
    const connection = getConnection(KvRepository.#connections, key);
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

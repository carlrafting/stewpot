export class KvRepository {
  public connection: Deno.Kv | null = null;

  private connections: Map<string, Deno.Kv> = new Map();

  static set connections(connections: Map<string, Deno.Kv>) {
    this.connections = connections;
  }

  constructor(key: string) {
    const connection = this.connections.has(key)
      ? this.connections.get(key)
      : null;
    if (!connection) throw `no connection with key: "${key}" exists!`;
    this.connection = connection;
  }

  async getAllByKey(key: string) {
    const prefix = [key];
    const results = this.connection?.list({
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

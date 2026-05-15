import type { SessionManager } from "../session/manager.ts";

export type FlashType = "error" | "success" | "info";

export interface FlashMethods {
  set(key: FlashType, value: string): Promise<void>;
  get(key: FlashType): Promise<string | undefined>;
  // getAll(key?: FlashType): Record<string, string>;
}

export async function createFlash(
  session: SessionManager,
): Promise<FlashMethods> {
  return {
    async set(key: FlashType, value: string) {
      await session.set(`flash:${key}`, value);
    },
    async get(key: FlashType) {
      const value = session.get<string>(`flash:${key}`);
      await session.delete(`flash:${key}`);
      return value;
    },
  };
}

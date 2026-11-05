import type { BuildAdapter } from "./adapter.ts";
import { lumeAdapter } from "./lume.ts";

export const buildAdapters: BuildAdapter[] = [lumeAdapter];

export function findBuildAdapter(id: string): BuildAdapter | undefined {
  return buildAdapters.find((adapter) => adapter.id === id);
}

import { stewpot, stream } from "../../stewpot.js";

export function main() {
  return stewpot({
    handler() {
      return () => stream(() => `${new Date().toISOString()}\n`);
    },
  });
}

if (import.meta.main) {
  main();
}

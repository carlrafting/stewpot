import { readFile } from 'fs/promises';

export default async function importJSON(file) {
  if (!file) {
    throw new Error(`Expected file as first argument!`);
  }

  return JSON.parse(
    await readFile(
      new URL(file, import.meta.url)
    )
  );
}

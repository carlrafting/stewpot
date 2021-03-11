import * as fs from 'fs/promises';

export async function exists(path) {
  try {
    const file = await fs.access(path);
    return true;
  } catch (err) {
    if (err.errno === -2) {
      return false;
    }
  }
}

import fs from 'fs';

export async function exists(path) {
  try {
    await fs.promises.access(path);
    return true;
  } catch (err) {
    if (err.errno === -2) {
      return false;
    }
  }
}

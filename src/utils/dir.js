import fs from 'fs';
import _path from 'path';

/** 
 * @typedef {Object} defaults
 * @property {boolean} recursive get directory content recursively
 * @property {boolean} clearResults when true, results set is cleared between method calls
 * @property {boolean} filesOnly only get directory file contents
 * @property {boolean} dirsOnly only get a directorys directory contents
 **/
const defaults = {
  recursive: true,
  clearResults: true,
  filesOnly: false,
  dirsOnly: false
};

let _refs = null;

/**
 * Add content of a directory to  a results set, recursive by default.
 * 
 * @returns {results} a results set of directory contents
 */
export async function getDirContent(path = '.', options={ ...defaults }) {
  /** @typedef {Set<string>} results */
  const results = !_refs ? new Set() : _refs;
  
  const dir = await fs.promises.opendir(path);

  const _options = {
    ...defaults,
    ...options
  };

  for await (const dirent of dir) {
    const filePath = _path.join(path, dirent.name);

    console.log(dirent);

    if (_options.recursive) {
      if (dirent.isDirectory()) {
        results.add(filePath);
        _refs = results;
        await getDirContent(filePath, _options);
      }
    }

    if (_options.filesOnly) {
      if (dirent.isFile()) {
        results.add(filePath);
      }
    }
  }

  // if (_options.clearResults) {
  //   results.clear();
  // }

  return results;
}

/**
 * Default method that handles errors internally, instead of having the developer doing it.
 * 
 * @alias getDirContent
 */
export default async (path = '.', options={ ...defaults }) => {
  try {
    const contents = getDirContent(path, options); 
    return (await contents);
  } catch (err) {
    console.error(err);
  }
};

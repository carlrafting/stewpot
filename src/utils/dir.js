import fs from 'fs';
import _path from 'path';

/** @typedef {Set<string>} results */
const results = new Set();

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

let count = 0;

/**
 * Add content of a directory to  a results set, recursive by default.
 * 
 * @returns {results} a results set of directory contents
 */
export async function getDirContent(path = '.', options={ ...defaults }) {
  const dir = await fs.promises.opendir(path);

  const _options = {
    ...defaults,
    ...options
  };

  if (_options.clearResults && (count === 0)) {
    results.clear();
  }

  for await (const dirent of dir) {
    const filePath = _path.join(path, dirent.name);

    if (_options.recursive) {
      if (dirent.isDirectory()) {
        count+=1;
        getDirContent(_path.join(path, dirent.name), _options);
      }
    }

    if (_options.filesOnly) {
      if (dirent.isFile()) {
        return results.add(filePath);
      }
    }

    results.add(filePath);
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

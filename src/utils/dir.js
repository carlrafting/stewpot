import fs from 'fs';
import _path from 'path';

/** 
 * @typedef {Object} defaults
 * @property {boolean} recursive get directory content recursively
 * @property {boolean} clearResults when true, results set is cleared between method calls
 * @property {boolean} maxDepth max depth to traverse directories
 * @property {boolean} filesOnly only get directory file contents
 * @property {boolean} dirsOnly only get a directorys directory contents
 **/
const defaults = {
  recursive: true,
  clearResults: true,
  maxDepth: 3,
  filesOnly: false,
  dirsOnly: false
};

let _refs = null;

/** @typedef {Set<string>} results */
const results = !_refs ? new Set() : _refs;

/**
 * Add content of a directory to  a results set, recursive by default.
 * 
 * @returns {results} a results set of directory contents
 */
export async function getDirContent(path = '.', options={ ...defaults }) {
  const dir = await fs.promises.opendir(path);
  
  let depth = 0; 

  const _options = {
    ...defaults,
    ...options
  };

  if (depth >= _options.maxDepth) {
    return results;
  }

  for await (const dirent of dir) {
    const filePath = _path.join(path, dirent.name);

    console.log(dirent);

    if (_options.recursive && dirent.isDirectory()) {
      depth+=1;
      await getDirContent(filePath, _options);
    }
    
    if (_options.filesOnly) {
      if (dirent.isFile()) {
        results.add(filePath);
      }
    }

    results.add(filePath);
  }

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

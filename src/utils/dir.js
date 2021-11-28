import fs from 'fs';
import _path from 'path';

export default async function init(path = '.', options={}) {
  /** 
   * @typedef {Object} defaults
   * @property {Boolean} recursive get directory content recursively
   * @property {Boolean} clearResults when true, results set is cleared between method calls
   * @property {Number} maxDepth max depth to traverse directories
   * @property {Boolean} filesOnly only get directory file contents
   * @property {Boolean} dirsOnly only get a directorys directory contents
   * @returns {results} a results set of directory contents
   **/

  const defaults = {
    recursive: true,
    clearResults: true,
    maxDepth: 3,
    filesOnly: false,
    dirsOnly: false
  };

  let _refs = null;
  let depth = 0;

  function clearRefsAndDepth() {
    (_refs = null) && (depth = 0);
  }

  /** @typedef {Set<string>} results */
  const results = !_refs ? new Set() : _refs;

  const dir = await fs.promises.opendir(path);

  const _options = {
    ...defaults,
    ...options
  };

  if (depth >= _options.maxDepth) {
    clearRefsAndDepth();
    return results;
  }

  for await (const dirent of dir) {
    const filePath = _path.resolve(path, dirent.name);

    console.log(filePath);

    if (_options.recursive && dirent.isDirectory()) {
      depth+=1;
      init(filePath, _options);
    }
  }

  return results;
}

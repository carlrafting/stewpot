#!/usr/bin/env node

import fs from 'fs';
import { spawn } from 'child_process';
import process from 'process';
import path from 'path';
import debounce from 'lodash/debounce.js';

async function onWatch(event, filename) {
  console.log('filename:', filename);
  console.log('event:', event);

  if (!filename) {
    throw new Error(`filename reporting not supported on this system.`);
  }

  if (filename && event === 'change') {
    try {
      const filePath = path.join('test', filename);
      const spawnNode = spawn('node', [ filePath ], { shell: true });
      spawnNode.stdout.on('data', (data) => {
        process.stdout.write(data, (err) => {
          if (err) {
            throw err;
          }
        });
      });
      spawnNode.stderr.on('data', (data) => {
        process.stderr.write(data, (err) => {
          if (err) {
            throw err;
          }
        });
      });
    } catch (err) {
      console.error(err);
    }
  }  
}

// recursive watching is only supported on macOS and Windows
// https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_watch_filename_options_listener
const watchRecursivePlatformCheck = (platform) => {
  const windows = 'win32';
  const macOS = 'darwin';

  return (platform === (windows || macOS));
};

fs.watch('./test', { recursive: watchRecursivePlatformCheck(process.platform) }, debounce(onWatch, 100));

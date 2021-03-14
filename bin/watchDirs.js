#!/usr/bin/env node

import fs from 'fs';
import { spawn } from 'child_process';
import process from 'process';

function onWatch(event, filename) {
  if (filename) console.log(`${filename} was ${event}`);
  
  try {
    const test = spawn('npm', ['run', 'test'], { shell: true });
    test.stdout.pipe(process.stdout);
    test.stderr.pipe(process.stderr);
    test.on('close', (code) => console.log(`Exited with ${code}`));
    test.on('error', (err) => console.log(err));
  } catch (err) {
    console.log(err);
  }
}

// recursive watching is only supported on macOS and Windows
// https://nodejs.org/dist/latest-v14.x/docs/api/fs.html#fs_fs_watch_filename_options_listener
const watchRecursivePlatformCheck = (platform) => {
  const windows = "win32";
  const macOS = "darwin";

  return (platform === (windows || macOS));
};

fs.watch('./src', { recursive: watchRecursivePlatformCheck(process.platform) }, onWatch);
fs.watch('./test', { recursive: watchRecursivePlatformCheck(process.platform) }, onWatch);

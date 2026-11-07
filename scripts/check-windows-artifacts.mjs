import { readdir } from 'node:fs/promises';

const files = await readdir('release');
for (const pattern of [/\.exe$/i, /\.exe\.blockmap$/i, /^latest\.yml$/]) {
  if (!files.some(file => pattern.test(file))) {
    throw new Error('Windows installer or update metadata is missing from release/.');
  }
}
console.log('Windows installer, blockmap, and update manifest are ready.');

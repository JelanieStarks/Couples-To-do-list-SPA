import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const executable = resolve('release', 'win-unpacked', pkg.build.productName + '.exe');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, ['--smoke-test'], { env, windowsHide: true, stdio: 'pipe' });
let output = '';
child.stdout.on('data', data => { output += data; });
child.stderr.on('data', data => { output += data; });
const timeout = setTimeout(() => {
  child.kill();
  console.error(output);
  console.error('The packaged desktop app did not finish its startup check within 45 seconds.');
  process.exitCode = 1;
}, 45_000);
child.on('error', error => {
  clearTimeout(timeout);
  console.error(error.message);
  process.exitCode = 1;
});
child.on('close', code => {
  clearTimeout(timeout);
  console.log(output);
  if (code !== 0 || !output.includes('Desktop startup check passed.')) process.exitCode = 1;
});

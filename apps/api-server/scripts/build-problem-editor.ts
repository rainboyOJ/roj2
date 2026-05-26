import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
const outDir = path.join(rootDir, 'apps', 'api-server', 'src', 'assets', 'editor');
const entryFile = path.join(rootDir, 'apps', 'api-server', 'src', 'client', 'problem-editor.ts');

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [entryFile],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  outfile: path.join(outDir, 'problem-editor.js'),
  sourcemap: false,
  minify: true,
  logLevel: 'info',
});

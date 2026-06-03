import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyInstance, FastifyReply } from 'fastify';

import { ASSET_CACHE_CONTROL, type RouteContext } from '../http/context.ts';

type AssetMode = 'text' | 'binary';

interface AssetManifestEntry {
  filePath: string[];
  contentType: string;
  mode: AssetMode;
}

const textAsset = (
  filePath: string[],
  contentType: string,
): AssetManifestEntry => ({
  filePath,
  contentType,
  mode: 'text',
});

const binaryAsset = (
  filePath: string[],
  contentType: string,
): AssetManifestEntry => ({
  filePath,
  contentType,
  mode: 'binary',
});

const fontFamilies = [
  'KaTeX_AMS-Regular',
  'KaTeX_Caligraphic-Bold',
  'KaTeX_Caligraphic-Regular',
  'KaTeX_Fraktur-Bold',
  'KaTeX_Fraktur-Regular',
  'KaTeX_Main-Bold',
  'KaTeX_Main-BoldItalic',
  'KaTeX_Main-Italic',
  'KaTeX_Main-Regular',
  'KaTeX_Math-BoldItalic',
  'KaTeX_Math-Italic',
  'KaTeX_SansSerif-Bold',
  'KaTeX_SansSerif-Italic',
  'KaTeX_SansSerif-Regular',
  'KaTeX_Script-Regular',
  'KaTeX_Size1-Regular',
  'KaTeX_Size2-Regular',
  'KaTeX_Size3-Regular',
  'KaTeX_Size4-Regular',
  'KaTeX_Typewriter-Regular',
];

const fontContentTypes = {
  ttf: 'font/ttf',
  woff: 'font/woff',
  woff2: 'font/woff2',
} as const;

const assetManifest = new Map<string, AssetManifestEntry>([
  ['/favicon.svg', textAsset(['assets', 'favicon.svg'], 'image/svg+xml')],
  ['/assets/pico.classless.min.css', textAsset(['assets', 'pico.classless.min.css'], 'text/css')],
  ['/assets/katex.min.css', textAsset(['assets', 'katex.min.css'], 'text/css')],
  ['/assets/notyf.min.css', textAsset(['assets', 'notyf.min.css'], 'text/css')],
  ['/assets/site.css', textAsset(['assets', 'site.css'], 'text/css')],
  ['/assets/axios.min.js', textAsset(['assets', 'axios.min.js'], 'application/javascript; charset=utf-8')],
  ['/assets/notyf.min.js', textAsset(['assets', 'notyf.min.js'], 'application/javascript; charset=utf-8')],
  ['/assets/notify.js', textAsset(['assets', 'notify.js'], 'application/javascript; charset=utf-8')],
  ['/assets/form-utils.js', textAsset(['assets', 'form-utils.js'], 'application/javascript; charset=utf-8')],
  ['/assets/register.js', textAsset(['assets', 'register.js'], 'application/javascript; charset=utf-8')],
  ['/assets/login.js', textAsset(['assets', 'login.js'], 'application/javascript; charset=utf-8')],
  ['/assets/profile-password.js', textAsset(['assets', 'profile-password.js'], 'application/javascript; charset=utf-8')],
  ['/assets/profile-class.js', textAsset(['assets', 'profile-class.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-problem-form.js', textAsset(['assets', 'admin-problem-form.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-problems.js', textAsset(['assets', 'admin-problems.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-actions.js', textAsset(['assets', 'admin-actions.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-grades.js', textAsset(['assets', 'admin-grades.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-language-settings.js', textAsset(['assets', 'admin-language-settings.js'], 'application/javascript; charset=utf-8')],
  ['/assets/admin-users.js', textAsset(['assets', 'admin-users.js'], 'application/javascript; charset=utf-8')],
  ['/assets/submission-detail.js', textAsset(['assets', 'submission-detail.js'], 'application/javascript; charset=utf-8')],
  ['/assets/editor/problem-editor.js', textAsset(['assets', 'editor', 'problem-editor.js'], 'application/javascript; charset=utf-8')],
  ...fontFamilies.flatMap((fontName) =>
    Object.entries(fontContentTypes).map(([extension, contentType]) => [
      `/assets/fonts/${fontName}.${extension}`,
      binaryAsset(['assets', 'fonts', `${fontName}.${extension}`], contentType),
    ] as const),
  ),
]);

export function registerStaticRoutes(app: FastifyInstance, context: RouteContext) {
  app.get('/favicon.svg', (request, reply) => serveManifestAsset(request.url, reply, context));
  app.get('/assets/*', (request, reply) => serveManifestAsset(request.url, reply, context));
}

async function serveManifestAsset(
  requestUrl: string,
  reply: FastifyReply,
  context: RouteContext,
) {
  const pathname = requestUrl.split('?')[0] || requestUrl;
  const entry = assetManifest.get(pathname);
  if (!entry) {
    return reply.code(404).send('Asset not found');
  }

  const file = await readFile(
    path.join(context.sourceDir, ...entry.filePath),
    entry.mode === 'text' ? 'utf-8' : undefined,
  );
  return reply
    .header('cache-control', ASSET_CACHE_CONTROL)
    .type(entry.contentType)
    .send(file);
}

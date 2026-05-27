import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { FastifyInstance } from 'fastify';

import { ASSET_CACHE_CONTROL, type RouteContext } from '../http/context.ts';

export function registerStaticRoutes(app: FastifyInstance, context: RouteContext) {
  app.get('/favicon.svg', async (_request, reply) => {
    const favicon = await readFile(path.join(context.sourceDir, 'assets', 'favicon.svg'), 'utf-8');
    return reply.header('cache-control', ASSET_CACHE_CONTROL).type('image/svg+xml').send(favicon);
  });

  app.get('/assets/:file', async (request, reply) => {
    const params = request.params as { file: string };
    const allowedAssets = new Map([
      ['pico.classless.min.css', 'text/css'],
      ['katex.min.css', 'text/css'],
      ['axios.min.js', 'application/javascript; charset=utf-8'],
      ['form-utils.js', 'application/javascript; charset=utf-8'],
      ['register.js', 'application/javascript; charset=utf-8'],
      ['login.js', 'application/javascript; charset=utf-8'],
      ['profile-password.js', 'application/javascript; charset=utf-8'],
      ['admin-problem-form.js', 'application/javascript; charset=utf-8'],
      ['admin-language-settings.js', 'application/javascript; charset=utf-8'],
      ['submission-detail.js', 'application/javascript; charset=utf-8'],
    ]);
    const contentType = allowedAssets.get(params.file);
    if (!contentType) {
      return reply.code(404).send('Asset not found');
    }

    const asset = await readFile(path.join(context.sourceDir, 'assets', params.file), 'utf-8');
    return reply.header('cache-control', ASSET_CACHE_CONTROL).type(contentType).send(asset);
  });

  app.get('/assets/editor/problem-editor.js', async (_request, reply) => {
    const js = await readFile(
      path.join(context.sourceDir, 'assets', 'editor', 'problem-editor.js'),
      'utf-8',
    );
    return reply
      .header('cache-control', ASSET_CACHE_CONTROL)
      .type('application/javascript; charset=utf-8')
      .send(js);
  });

  app.get('/assets/fonts/:file', async (request, reply) => {
    const params = request.params as { file: string };
    if (!/^[A-Za-z0-9_.-]+$/.test(params.file)) {
      return reply.code(400).send('Invalid font path');
    }

    const font = await readFile(path.join(context.sourceDir, 'assets', 'fonts', params.file));
    if (params.file.endsWith('.woff2')) {
      return reply.header('cache-control', ASSET_CACHE_CONTROL).type('font/woff2').send(font);
    }
    if (params.file.endsWith('.woff')) {
      return reply.header('cache-control', ASSET_CACHE_CONTROL).type('font/woff').send(font);
    }
    if (params.file.endsWith('.ttf')) {
      return reply.header('cache-control', ASSET_CACHE_CONTROL).type('font/ttf').send(font);
    }

    return reply.code(404).send('Font not found');
  });
}

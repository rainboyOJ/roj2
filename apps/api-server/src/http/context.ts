import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppLanguage } from '@roj/shared';

import type { ApiServerServices, SessionUser } from '../app.ts';
import { assetUrl, getAssetCacheControl } from './assets.ts';
import { createViewHelpers } from '../view-helpers.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_PAGE_SIZE = 20;
export const ASSET_CACHE_CONTROL = getAssetCacheControl();

export interface RouteContext {
  services: ApiServerServices;
  sourceDir: string;
  parseSessionToken(cookieHeader: string | undefined): string | null;
  setSessionCookie(reply: { header(name: string, value: string): unknown }, token: string): void;
  clearSessionCookie(reply: { header(name: string, value: string): unknown }): void;
  filterAllowedLanguages(
    allowLanguages: string[],
    enabledLanguages: readonly AppLanguage[],
  ): string[];
  parsePage(query: unknown): number;
  renderPage(
    request: { query?: unknown; url: string; headers?: { cookie?: string | undefined } },
    reply: { view(template: string, data?: Record<string, unknown>): unknown },
    template: string,
    data?: Record<string, unknown>,
  ): Promise<unknown>;
  redirectTo(
    reply: { redirect(location: string): unknown },
    pathname: string,
  ): unknown;
  getRequestUser(request: FastifyRequest): Promise<SessionUser | null>;
  requireHtmlUser(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null>;
  requireHtmlAdmin(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null>;
  requireApiUser(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null>;
  requireApiAdmin(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null>;
}

export function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === 'roj_session') {
      return rest.join('=') || null;
    }
  }

  return null;
}

export function setSessionCookie(reply: {
  header(name: string, value: string): unknown;
}, token: string) {
  reply.header(
    'set-cookie',
    `roj_session=${token}; Path=/; HttpOnly; SameSite=Lax`,
  );
}

export function clearSessionCookie(reply: {
  header(name: string, value: string): unknown;
}) {
  reply.header(
    'set-cookie',
    'roj_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  );
}

export function filterAllowedLanguages(
  allowLanguages: string[],
  enabledLanguages: readonly AppLanguage[],
): string[] {
  return allowLanguages.filter((language) =>
    enabledLanguages.includes(language as AppLanguage),
  );
}

export function parsePage(query: unknown): number {
  const rawPage =
    typeof query === 'object' && query !== null && 'page' in query
      ? (query as { page?: unknown }).page
      : undefined;
  const pageText = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const page = Number(pageText ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function createRouteContext(services: ApiServerServices): RouteContext {
  const sourceDir = path.resolve(__dirname, '..');

  async function renderPage(
    request: { query?: unknown; url: string; headers?: { cookie?: string | undefined } },
    reply: { view(template: string, data?: Record<string, unknown>): unknown },
    template: string,
    data: Record<string, unknown> = {},
  ) {
    // 所有 Pug 页面都走这个统一入口，
    // 这样模板天然就能拿到静态资源 helper、当前用户和 admin 区域标记。
    const currentPath = request.url || '/';
    const sessionToken = parseSessionToken(request.headers?.cookie);
    const currentUser = sessionToken ? await services.getCurrentUser(sessionToken) : null;
    const pathname = currentPath.split('?')[0] || '/';
    return reply.view(template, {
      ...createViewHelpers(),
      assetUrl,
      currentUser,
      isAdminArea: pathname === '/admin' || pathname.startsWith('/admin/'),
      ...data,
    });
  }

  function redirectTo(
    reply: { redirect(location: string): unknown },
    pathname: string,
  ) {
    return reply.redirect(pathname);
  }

  async function getRequestUser(request: FastifyRequest): Promise<SessionUser | null> {
    const token = parseSessionToken(request.headers.cookie);
    return services.getCurrentUser(token);
  }

  async function requireHtmlUser(request: FastifyRequest, reply: FastifyReply) {
    const user = await getRequestUser(request);
    if (!user) {
      redirectTo(reply, '/login');
      return null;
    }
    return user;
  }

  async function requireHtmlAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return null;
    }
    if (user.role !== 'admin') {
      reply.code(403).send('Forbidden');
      return null;
    }
    return user;
  }

  async function requireApiUser(request: FastifyRequest, reply: FastifyReply) {
    const user = await getRequestUser(request);
    if (!user) {
      reply.code(401).send({ message: 'Login required' });
      return null;
    }
    return user;
  }

  async function requireApiAdmin(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireApiUser(request, reply);
    if (!user) {
      return null;
    }
    if (user.role !== 'admin') {
      reply.code(403).send({ message: 'Admin required' });
      return null;
    }
    return user;
  }

  return {
    services,
    sourceDir,
    parseSessionToken,
    setSessionCookie,
    clearSessionCookie,
    filterAllowedLanguages,
    parsePage,
    renderPage,
    redirectTo,
    getRequestUser,
    requireHtmlUser,
    requireHtmlAdmin,
    requireApiUser,
    requireApiAdmin,
  };
}

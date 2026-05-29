import type { AppLanguage } from '@roj/shared';

export const DEFAULT_LIST_PAGE_SIZE = 20;
export const ALLOWED_LIST_PAGE_SIZES = [20, 50, 100] as const;
export type ListPageSize = (typeof ALLOWED_LIST_PAGE_SIZES)[number];

export function parseEnabledLanguagesEnv(value: string | undefined): AppLanguage[] {
  if (!value) {
    return ['cpp', 'python'];
  }

  const languages = value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is AppLanguage => item === 'cpp' || item === 'python');
  const uniqueLanguages = Array.from(new Set(languages));
  return uniqueLanguages.length > 0 ? uniqueLanguages : ['cpp', 'python'];
}

export function normalizeListPageSize(value: unknown): ListPageSize {
  const pageSize = Number(value);
  return ALLOWED_LIST_PAGE_SIZES.includes(pageSize as ListPageSize)
    ? pageSize as ListPageSize
    : DEFAULT_LIST_PAGE_SIZE;
}

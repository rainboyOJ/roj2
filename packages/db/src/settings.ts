import type { Collection } from 'mongodb';
import type { AppLanguage } from '@roj/shared';
import type { SiteSettingsDocument } from '@roj/shared';

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

export function buildEnabledLanguagesUpdate(enabledLanguages: AppLanguage[], now: Date) {
  return {
    enabledLanguages,
    updatedAt: now,
  };
}

export function buildListPageSizeUpdate(listPageSize: number, now: Date) {
  return {
    listPageSize: normalizeListPageSize(listPageSize),
    updatedAt: now,
  };
}

export async function getEnabledLanguages(
  settings: Collection<SiteSettingsDocument>,
): Promise<readonly AppLanguage[]> {
  const document = await settings.findOne({ _id: 'site_settings' });
  if (!document || document.enabledLanguages.length === 0) {
    return ['cpp', 'python'];
  }
  return document.enabledLanguages;
}

export async function getListPageSize(
  settings: Collection<SiteSettingsDocument>,
): Promise<ListPageSize> {
  const document = await settings.findOne({ _id: 'site_settings' });
  return normalizeListPageSize(document?.listPageSize);
}

export async function updateEnabledLanguages(
  settings: Collection<SiteSettingsDocument>,
  enabledLanguages: AppLanguage[],
) {
  await settings.updateOne(
    { _id: 'site_settings' },
    {
      $set: buildEnabledLanguagesUpdate(enabledLanguages, new Date()),
    },
    { upsert: true },
  );
}

export async function updateListPageSize(
  settings: Collection<SiteSettingsDocument>,
  listPageSize: number,
) {
  await settings.updateOne(
    { _id: 'site_settings' },
    {
      $set: buildListPageSizeUpdate(listPageSize, new Date()),
    },
    { upsert: true },
  );
}

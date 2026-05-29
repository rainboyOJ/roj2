import type { AppLanguage } from './languages.ts';

export interface SiteSettingsDocument {
  _id: 'site_settings';
  enabledLanguages: AppLanguage[];
  listPageSize: number;
  updatedAt: Date;
}

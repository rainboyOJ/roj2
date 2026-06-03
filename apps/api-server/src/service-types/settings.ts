import type { AppLanguage } from '@roj/shared';

export interface LanguageSettingsViewModel {
  enabledLanguages: AppLanguage[];
}

export interface PaginationSettingsViewModel {
  listPageSize: number;
  allowedPageSizes: number[];
}

export interface SettingsServices {
  getEnabledLanguages(): Promise<readonly AppLanguage[]>;
  updateEnabledLanguages(enabledLanguages: AppLanguage[]): Promise<void>;
  getPaginationSettings(): Promise<PaginationSettingsViewModel>;
  updateListPageSize(listPageSize: number): Promise<void>;
}

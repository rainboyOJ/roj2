import { ALLOWED_LIST_PAGE_SIZES, type RojDb } from '@roj/db';
import type { AppLanguage } from '@roj/shared';

import type { SettingsServices } from '../../service-types.ts';

export function buildSettingsServices(db: RojDb): SettingsServices {
  return {
    getEnabledLanguages: async (): Promise<readonly AppLanguage[]> => db.getEnabledLanguages(),
    updateEnabledLanguages: async (enabledLanguages) => {
      await db.updateEnabledLanguages(enabledLanguages);
    },
    getPaginationSettings: async () => ({
      listPageSize: await db.getListPageSize(),
      allowedPageSizes: [...ALLOWED_LIST_PAGE_SIZES],
    }),
    updateListPageSize: async (listPageSize) => {
      await db.updateListPageSize(listPageSize);
    },
    getSubmissionSettings: async () => ({
      submissionIntervalSeconds: await db.getSubmissionIntervalSeconds(),
    }),
    updateSubmissionIntervalSeconds: async (submissionIntervalSeconds) => {
      await db.updateSubmissionIntervalSeconds(submissionIntervalSeconds);
    },
  };
}

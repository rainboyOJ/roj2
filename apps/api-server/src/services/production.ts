import type { RojDb } from '@roj/db';

import type { ApiServerServices } from '../service-types.ts';
import { buildContestServices } from './production/contests.ts';
import { buildDictionaryServices } from './production/dictionaries.ts';
import { buildProblemSetServices } from './production/problem-sets.ts';
import { buildProblemServices } from './production/problems.ts';
import { buildRanklistServices } from './production/ranklist.ts';
import { buildSettingsServices } from './production/settings.ts';
import { buildSubmissionServices } from './production/submissions.ts';
import { buildUserServices } from './production/users.ts';

export async function buildProductionServices(db: RojDb): Promise<ApiServerServices> {
  return {
    ...buildSubmissionServices(db),
    ...buildProblemServices(db),
    ...buildProblemSetServices(db),
    ...buildUserServices(db),
    ...buildDictionaryServices(db),
    ...buildSettingsServices(db),
    ...buildRanklistServices(db),
    ...buildContestServices(),
  };
}

import type { RojDb } from '@roj/db';

import type {
  RanklistEntryViewModel,
  RanklistServices,
} from '../../service-types.ts';
import { formatDateTime } from '../mappers.ts';

export function buildRanklistServices(db: RojDb): RanklistServices {
  return {
    listRanklist: async (filters) => {
      const rows = await db.buildSimpleRanklist(filters);
      return rows.map((row, index): RanklistEntryViewModel => ({
        rank: index + 1,
        username: row.username,
        displayName: row.displayName || row.username,
        className: row.className,
        acceptedCount: row.acceptedCount,
        submissionCount: row.submissionCount,
        lastAcceptedAt: formatDateTime(row.lastAcceptedAt),
      }));
    },
  };
}

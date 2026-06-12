import type { RojDb } from '@roj/db';
import type { CreateSubmissionInput } from '@roj/shared';

import type { SubmissionServices } from '../../service-types.ts';
import {
  mapPaginatedSubmissions,
  mapSubmission,
} from '../mappers.ts';

export function buildSubmissionServices(db: RojDb): SubmissionServices {
  return {
    createSubmission: async (input: CreateSubmissionInput) => {
      // 注意：这里只写数据库，不直接等待评测结果。
      const created = await db.createSubmission(input);
      return {
        id: created._id,
        publicId: created.submissionNo === undefined ? created._id : String(created.submissionNo),
        submissionNo: created.submissionNo ?? null,
        status: created.status,
        verdict: created.verdict,
      };
    },
    getSubmissionById: async (id: string) => {
      const submission = await db.getSubmissionWithProblemByPublicId(id);
      return submission ? mapSubmission(submission) : null;
    },
    listSubmissions: async (user, pagination, filters = {}) => {
      const result = await db.listSubmissionsWithProblemsPaginated({
        ...pagination,
        filters,
      });
      return {
        ...mapPaginatedSubmissions(result, pagination.page, pagination.pageSize, user),
        filters,
      };
    },
    listAdminSubmissions: async (pagination) => {
      const result = await db.listAllSubmissionsWithProblemsPaginated(pagination);
      return mapPaginatedSubmissions(result, pagination.page, pagination.pageSize);
    },
    countDeletedUserSubmissionCleanup: async () => db.countDeletedUserSubmissionCleanup(),
    cleanupDeletedUserSubmissions: async () => db.cleanupDeletedUserSubmissions(),
  };
}

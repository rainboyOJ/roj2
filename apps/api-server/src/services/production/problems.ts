import type { RojDb } from '@roj/db';

import type { ProblemServices } from '../../service-types.ts';
import {
  mapAdminProblem,
  mapProblem,
} from '../mappers.ts';
import { buildPaginationViewModel } from '../pagination.ts';

export function buildProblemServices(db: RojDb): ProblemServices {
  return {
    listProblems: async () => {
      const problems = await db.listVisibleProblems();
      return problems.map(mapProblem);
    },
    listProblemsPaginated: async (pagination) => {
      const input = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        ...(pagination.filters ? { filters: pagination.filters } : {}),
      };
      const result = await db.listVisibleProblemsPaginated(input);
      return {
        problems: result.items.map(mapProblem),
        pagination: buildPaginationViewModel({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total,
        }),
      };
    },
    listProblemsByPids: async (pids) => {
      const problems = await db.listVisibleProblemsByPids(pids);
      return problems.map(mapProblem);
    },
    listProblemProgressByUser: async (userId: string) => db.listProblemProgressByUser(userId),
    getProblemByPid: async (pid: string) => {
      const problem = await db.getProblemByPid(pid);
      return problem ? mapProblem(problem) : null;
    },
    listAdminProblems: async (filters) => {
      const problems = await db.listAdminProblems(filters);
      return problems.map(mapAdminProblem);
    },
    getAdminProblemById: async (id) => {
      const problem = await db.getAdminProblemById(id);
      return problem ? mapAdminProblem(problem) : null;
    },
    createProblem: async (input) => {
      const problem = await db.createProblem(input);
      return {
        id: problem._id,
        pid: problem.pid,
      };
    },
    updateProblem: async (id, input) => {
      await db.updateProblem(id, input);
    },
    publishProblem: async (id) => {
      await db.publishProblem(id);
    },
  };
}

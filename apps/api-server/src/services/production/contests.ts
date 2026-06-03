import type { ContestServices } from '../../service-types.ts';
import { buildPlaceholderContests } from '../contests.ts';

export function buildContestServices(): ContestServices {
  return {
    listContests: async () => buildPlaceholderContests(),
    getContestById: async (id) => {
      const contests = buildPlaceholderContests();
      return contests.find((contest) => contest.id === id) ?? null;
    },
  };
}

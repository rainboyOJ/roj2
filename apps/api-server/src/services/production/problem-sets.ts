import type { RojDb } from '@roj/db';

import type { ProblemSetServices } from '../../service-types.ts';
import {
  mapAdminProblemSet,
  mapProblemSetBase,
  mapProblemSetDetail,
} from '../mappers.ts';

export function buildProblemSetServices(db: RojDb): ProblemSetServices {
  return {
    listPublishedProblemSets: async () => {
      const problemSets = await db.listPublishedProblemSets();
      return problemSets.map(mapProblemSetBase);
    },
    getPublishedProblemSetById: async (id) => {
      const problemSet = await db.getPublishedProblemSetById(id);
      if (!problemSet) {
        return null;
      }
      return mapProblemSetDetail(problemSet);
    },
    listAdminProblemSets: async () => {
      const problemSets = await db.listAdminProblemSets();
      return problemSets.map(mapAdminProblemSet);
    },
    getAdminProblemSetById: async (id) => {
      const problemSet = await db.getAdminProblemSetById(id);
      return problemSet ? mapAdminProblemSet(problemSet) : null;
    },
    createProblemSet: async (input) => {
      const problemSet = await db.createProblemSet(input);
      return { id: problemSet._id };
    },
    updateProblemSet: async (id, input) => {
      await db.updateProblemSet(id, input);
    },
    publishProblemSet: async (id) => {
      await db.publishProblemSet(id);
    },
    hideProblemSet: async (id) => {
      await db.hideProblemSet(id);
    },
    deleteProblemSet: async (id) => {
      await db.deleteProblemSet(id);
    },
  };
}

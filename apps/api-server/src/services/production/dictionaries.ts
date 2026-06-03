import type { RojDb } from '@roj/db';

import type {
  ClassViewModel,
  DictionaryServices,
  GradeViewModel,
} from '../../service-types.ts';

function mapGrade(grade: {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
}): GradeViewModel {
  return {
    id: grade._id,
    name: grade.name,
    isActive: grade.isActive,
    order: grade.order,
  };
}

function mapClass(classRecord: {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
}): ClassViewModel {
  return {
    id: classRecord._id,
    name: classRecord.name,
    isActive: classRecord.isActive,
    order: classRecord.order,
  };
}

export function buildDictionaryServices(db: RojDb): DictionaryServices {
  return {
    listGrades: async () => {
      const grades = await db.listGrades();
      return grades.map(mapGrade);
    },
    createGrade: async (input) => {
      const grade = await db.createGrade(input);
      return mapGrade(grade);
    },
    updateGrade: async (id, input) => {
      await db.updateGrade(id, input);
    },
    listClasses: async () => {
      const classes = await db.listClasses();
      return classes.map(mapClass);
    },
    listActiveClasses: async () => {
      const classes = await db.listActiveClasses();
      return classes.map(mapClass);
    },
    createClass: async (input) => {
      const classRecord = await db.createClass(input);
      return mapClass(classRecord);
    },
    updateClass: async (id, input) => {
      await db.updateClass(id, input);
    },
  };
}

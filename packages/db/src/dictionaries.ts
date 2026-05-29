import { ObjectId, type Collection } from 'mongodb';
import type { ClassDocument, GradeDocument } from '@roj/shared';

export interface DictionaryInput {
  name: string;
  isActive: boolean;
  order: number;
}

export function buildGradeDocument(input: DictionaryInput, now: Date): GradeDocument {
  return {
    _id: new ObjectId().toHexString(),
    name: input.name,
    isActive: input.isActive,
    order: input.order,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildClassDocument(input: DictionaryInput, now: Date): ClassDocument {
  return {
    _id: new ObjectId().toHexString(),
    name: input.name,
    isActive: input.isActive,
    order: input.order,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDictionaryUpdateFields(input: DictionaryInput, now: Date) {
  return {
    name: input.name,
    isActive: input.isActive,
    order: input.order,
    updatedAt: now,
  };
}

export async function listGrades(grades: Collection<GradeDocument>) {
  return grades.find({}).sort({ order: 1 }).toArray();
}

export async function listClasses(classes: Collection<ClassDocument>) {
  return classes.find({}).sort({ order: 1 }).toArray();
}

export async function listActiveClasses(classes: Collection<ClassDocument>) {
  return classes.find({ isActive: true }).sort({ order: 1 }).toArray();
}

export async function createGrade(grades: Collection<GradeDocument>, input: DictionaryInput) {
  const now = new Date();
  const grade = buildGradeDocument(input, now);
  await grades.insertOne(grade);
  return grade;
}

export async function updateGrade(
  grades: Collection<GradeDocument>,
  id: string,
  input: DictionaryInput,
) {
  await grades.updateOne(
    { _id: id },
    {
      $set: buildDictionaryUpdateFields(input, new Date()),
    },
  );
}

export async function createClass(
  classes: Collection<ClassDocument>,
  input: DictionaryInput,
) {
  const now = new Date();
  const classRecord = buildClassDocument(input, now);
  await classes.insertOne(classRecord);
  return classRecord;
}

export async function updateClass(
  classes: Collection<ClassDocument>,
  id: string,
  input: DictionaryInput,
) {
  await classes.updateOne(
    { _id: id },
    {
      $set: buildDictionaryUpdateFields(input, new Date()),
    },
  );
}

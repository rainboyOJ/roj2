import { ObjectId } from 'mongodb';
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

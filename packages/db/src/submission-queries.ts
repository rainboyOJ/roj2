import type { Collection } from 'mongodb';
import type { ProblemDocument, SubmissionDocument } from '@roj/shared';

import {
  buildSubmissionListFilter,
  type SubmissionListFilters,
} from './submission-filters.ts';

export interface SubmissionQueryCollections {
  submissions: Collection<SubmissionDocument>;
  problems: Collection<ProblemDocument>;
}

export async function getSubmissionById(
  collections: Pick<SubmissionQueryCollections, 'submissions'>,
  id: string,
) {
  return collections.submissions.findOne({ _id: id });
}

export async function getSubmissionByNo(
  collections: Pick<SubmissionQueryCollections, 'submissions'>,
  submissionNo: number,
) {
  return collections.submissions.findOne({ submissionNo });
}

export async function getSubmissionByPublicId(
  collections: Pick<SubmissionQueryCollections, 'submissions'>,
  publicId: string,
) {
  if (/^\d+$/.test(publicId)) {
    const byNo = await getSubmissionByNo(collections, Number(publicId));
    if (byNo) {
      return byNo;
    }
  }
  return getSubmissionById(collections, publicId);
}

export async function getSubmissionWithProblemByPublicId(
  collections: SubmissionQueryCollections,
  publicId: string,
) {
  const submission = await getSubmissionByPublicId(collections, publicId);
  if (!submission) {
    return null;
  }

  const problem = await collections.problems.findOne({ _id: submission.problemId });
  return {
    ...submission,
    problem,
  };
}

export async function attachProblemsToSubmissions(
  collections: Pick<SubmissionQueryCollections, 'problems'>,
  submissions: SubmissionDocument[],
) {
  const problemIds = [...new Set(submissions.map((submission) => submission.problemId))];
  const problems = await collections.problems.find({ _id: { $in: problemIds } }).toArray();
  const problemById = new Map(problems.map((problem) => [problem._id, problem]));

  return submissions.map((submission) => ({
    ...submission,
    problem: problemById.get(submission.problemId) ?? null,
  }));
}

export async function listSubmissionsByUser(
  collections: Pick<SubmissionQueryCollections, 'submissions'>,
  userId: string,
) {
  return collections.submissions.find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function listSubmissionsWithProblemsByUser(
  collections: SubmissionQueryCollections,
  userId: string,
) {
  const submissions = await listSubmissionsByUser(collections, userId);
  return attachProblemsToSubmissions(collections, submissions);
}

export async function listSubmissionsByUserPaginated(
  collections: SubmissionQueryCollections,
  userId: string,
  input: {
    page: number;
    pageSize: number;
  },
) {
  const skip = (input.page - 1) * input.pageSize;
  const [items, total] = await Promise.all([
    collections.submissions
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.pageSize)
      .toArray(),
    collections.submissions.countDocuments({ userId }),
  ]);

  return {
    items: await attachProblemsToSubmissions(collections, items),
    total,
  };
}

export async function listSubmissionsWithProblemsPaginated(
  collections: SubmissionQueryCollections,
  input: {
    page: number;
    pageSize: number;
    filters?: SubmissionListFilters;
  },
) {
  const skip = (input.page - 1) * input.pageSize;
  const query = buildSubmissionListFilter(input.filters);
  const [items, total] = await Promise.all([
    collections.submissions
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.pageSize)
      .toArray(),
    collections.submissions.countDocuments(query),
  ]);

  return {
    items: await attachProblemsToSubmissions(collections, items),
    total,
  };
}

export async function listAllSubmissions(
  collections: Pick<SubmissionQueryCollections, 'submissions'>,
) {
  return collections.submissions.find({}).sort({ createdAt: -1 }).toArray();
}

export async function listAllSubmissionsWithProblems(collections: SubmissionQueryCollections) {
  const submissions = await listAllSubmissions(collections);
  return attachProblemsToSubmissions(collections, submissions);
}

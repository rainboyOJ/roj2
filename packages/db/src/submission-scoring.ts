import { SubmissionVerdicts, type SubmissionCaseResult } from '@roj/shared';

export function calculateSubmissionScore(
  caseResults: readonly SubmissionCaseResult[],
): number {
  if (caseResults.length === 0) {
    return 0;
  }

  const acceptedCount = caseResults.filter((item) => item.verdict === SubmissionVerdicts.AC).length;
  return Math.round((acceptedCount / caseResults.length) * 100);
}

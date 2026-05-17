import { describe, expect, it } from 'vitest';

import { mapJudgeSnapshotToSubmissionState } from '../src/index.ts';

describe('mapJudgeSnapshotToSubmissionState', () => {
  it('maps terminal AC to FINISHED', () => {
    expect(
      mapJudgeSnapshotToSubmissionState({
        status: 'FINISHED',
        verdict: 'AC',
      }),
    ).toEqual({
      status: 'FINISHED',
      verdict: 'AC',
    });
  });

  it('maps failed judge snapshots to FAILED', () => {
    expect(
      mapJudgeSnapshotToSubmissionState({
        status: 'FAILED',
        verdict: 'SYSTEM_ERROR',
      }),
    ).toEqual({
      status: 'FAILED',
      verdict: 'SYSTEM_ERROR',
    });
  });

  it('keeps non-terminal judge snapshots in JUDGING', () => {
    expect(
      mapJudgeSnapshotToSubmissionState({
        status: 'RUNNING',
        verdict: 'PENDING',
      }),
    ).toEqual({
      status: 'JUDGING',
      verdict: 'PENDING',
    });
  });
});

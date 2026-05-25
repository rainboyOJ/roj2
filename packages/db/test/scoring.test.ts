import { describe, expect, it } from 'vitest';

import { calculateSubmissionScore } from '../src/index.ts';

describe('calculateSubmissionScore', () => {
  it('returns a rounded 100-point score from equal-weight case results', () => {
    expect(calculateSubmissionScore([
      {
        seq_id: 1,
        verdict: 'AC',
        cpu_time_ms: 1,
        real_time_ms: 1,
        memory_kb: 1,
        signal: 0,
        exit_code: 0,
        error_code: 0,
      },
      {
        seq_id: 2,
        verdict: 'AC',
        cpu_time_ms: 1,
        real_time_ms: 1,
        memory_kb: 1,
        signal: 0,
        exit_code: 0,
        error_code: 0,
      },
      {
        seq_id: 3,
        verdict: 'WA',
        cpu_time_ms: 1,
        real_time_ms: 1,
        memory_kb: 1,
        signal: 0,
        exit_code: 0,
        error_code: 0,
      },
    ])).toBe(67);
  });

  it('returns zero when there are no case results', () => {
    expect(calculateSubmissionScore([])).toBe(0);
  });
});

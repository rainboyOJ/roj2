// 这组测试只验证 dispatcher 的编排行为，不连真实 judge_server。
import { describe, expect, it } from 'vitest';

import type { QueryResultResponse } from '@roj/judge-driver';
import { processSubmissionWithClient } from '../src/dispatcher.ts';

describe('processSubmissionWithClient', () => {
  it('stores final verdict from the judge client', async () => {
    const calls: string[] = [];
    const result = await processSubmissionWithClient(
      {
        id: 'local-1',
        pid: '1000',
        language: 'python',
        sourceCode: 'print(1)',
      },
      {
        submit: async () => ({
          submission_id: 10,
          status: 'QUEUED',
          verdict: 'PENDING',
          message: '',
          case_results: [],
          type: 'submission_ack' as const,
        }),
        queryResult: async () => ({
          submission_id: 10,
          status: 'FINISHED',
          verdict: 'AC',
          message: 'ok',
          case_results: [],
          type: 'submission_finished' as const,
        }),
      },
      {
        saveAck: async () => {
          calls.push('ack');
        },
        saveSnapshot: async (snapshot: { verdict: string }) => {
          calls.push(`snapshot:${snapshot.verdict}`);
        },
      },
    );

    expect(result.final.verdict).toBe('AC');
    expect(calls).toEqual(['ack', 'snapshot:AC']);
  });

  it('keeps polling until the judge returns a terminal snapshot', async () => {
    const calls: string[] = [];
    const snapshots: QueryResultResponse[] = [
      {
        submission_id: 10,
        status: 'RUNNING',
        verdict: 'PENDING',
        message: 'running',
        case_results: [],
        type: 'submission_update' as const,
      },
      {
        submission_id: 10,
        status: 'FINISHED',
        verdict: 'AC',
        message: 'done',
        case_results: [],
        type: 'submission_finished' as const,
      },
    ];

    const result = await processSubmissionWithClient(
      {
        id: 'local-1',
        pid: '1000',
        language: 'python',
        sourceCode: 'print(1)',
      },
      {
        submit: async () => ({
          submission_id: 10,
          status: 'QUEUED',
          verdict: 'PENDING',
          message: '',
          case_results: [],
          type: 'submission_ack' as const,
        }),
        queryResult: async () => snapshots.shift()!,
      },
      {
        saveAck: async () => {
          calls.push('ack');
        },
        saveSnapshot: async (snapshot: { verdict: string }) => {
          calls.push(`snapshot:${snapshot.verdict}`);
        },
      },
    );

    expect(result.final.verdict).toBe('AC');
    expect(calls).toEqual(['ack', 'snapshot:PENDING', 'snapshot:AC']);
  });
});

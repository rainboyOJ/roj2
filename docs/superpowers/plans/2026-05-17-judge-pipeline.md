# Judge Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable minimal OJ slice that persists submissions in MongoDB, dispatches them to `judge_server`, and exposes Pug/HTTP views to submit and inspect results.

**Architecture:** Use an npm workspace with two apps (`api-server`, `judge-dispatcher`) and three packages (`shared`, `db`, `judge-driver`). The API only creates and reads submissions; the dispatcher owns lease-based judging and persists snapshots from the existing TypeScript driver.

**Tech Stack:** Node.js 22+, TypeScript 5, Fastify, Pug, MongoDB Node Driver, Zod, Vitest

---

### Task 1: Workspace Bootstrap

**Files:**
- Create: `move_to_new_oj/package.json`
- Create: `move_to_new_oj/tsconfig.base.json`
- Create: `move_to_new_oj/vitest.config.ts`
- Modify: `move_to_new_oj/README.md`

- [ ] **Step 1: Write the failing workspace smoke test**

```ts
import { describe, expect, it } from 'vitest';

describe('workspace smoke', () => {
  it('loads test runner', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test`
Expected: FAIL because root workspace config and vitest script do not exist yet

- [ ] **Step 3: Write minimal workspace config**

```json
{
  "name": "move-to-new-oj",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.base.json --noEmit"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd move_to_new_oj && npm test`
Expected: PASS with the smoke test discovered

### Task 2: Shared Domain Types

**Files:**
- Create: `move_to_new_oj/packages/shared/package.json`
- Create: `move_to_new_oj/packages/shared/tsconfig.json`
- Create: `move_to_new_oj/packages/shared/src/index.ts`
- Create: `move_to_new_oj/packages/shared/test/domain.test.ts`

- [ ] **Step 1: Write the failing domain mapping test**

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test -- packages/shared/test/domain.test.ts`
Expected: FAIL because shared package does not exist

- [ ] **Step 3: Write minimal shared implementation**

```ts
export function mapJudgeSnapshotToSubmissionState(snapshot: {
  status: string;
  verdict: string;
}) {
  return {
    status: snapshot.status === 'FAILED' ? 'FAILED' : 'FINISHED',
    verdict: snapshot.verdict,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd move_to_new_oj && npm test -- packages/shared/test/domain.test.ts`
Expected: PASS

### Task 3: MongoDB Package

**Files:**
- Create: `move_to_new_oj/packages/db/package.json`
- Create: `move_to_new_oj/packages/db/tsconfig.json`
- Create: `move_to_new_oj/packages/db/src/index.ts`
- Create: `move_to_new_oj/packages/db/test/lease.test.ts`

- [ ] **Step 1: Write the failing lease logic test**

```ts
import { describe, expect, it } from 'vitest';
import { buildLeaseUpdate } from '../src/index.ts';

describe('buildLeaseUpdate', () => {
  it('writes owner and expiry for a claimed submission', () => {
    const now = new Date('2026-05-17T00:00:00.000Z');
    const result = buildLeaseUpdate('worker-1', now, 30000);

    expect(result.$set['judge.leaseOwner']).toBe('worker-1');
    expect(result.$set.status).toBe('SENT_TO_JUDGE');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test -- packages/db/test/lease.test.ts`
Expected: FAIL because db package does not exist

- [ ] **Step 3: Write minimal lease helpers**

```ts
export function buildLeaseUpdate(
  leaseOwner: string,
  now: Date,
  leaseMs: number,
) {
  return {
    $set: {
      status: 'SENT_TO_JUDGE',
      'judge.leaseOwner': leaseOwner,
      'judge.leaseExpireAt': new Date(now.getTime() + leaseMs),
      updatedAt: now,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd move_to_new_oj && npm test -- packages/db/test/lease.test.ts`
Expected: PASS

### Task 4: Dispatcher Core

**Files:**
- Create: `move_to_new_oj/apps/judge-dispatcher/package.json`
- Create: `move_to_new_oj/apps/judge-dispatcher/tsconfig.json`
- Create: `move_to_new_oj/apps/judge-dispatcher/src/dispatcher.ts`
- Create: `move_to_new_oj/apps/judge-dispatcher/src/index.ts`
- Create: `move_to_new_oj/apps/judge-dispatcher/test/dispatcher.test.ts`

- [ ] **Step 1: Write the failing dispatcher test**

```ts
import { describe, expect, it } from 'vitest';
import { processSubmissionWithClient } from '../src/dispatcher.ts';

describe('processSubmissionWithClient', () => {
  it('stores final verdict from the judge client', async () => {
    const calls: string[] = [];
    const result = await processSubmissionWithClient(
      {
        submissionId: 'local-1',
        judgeSubmissionId: null,
      },
      {
        submit: async () => ({ submission_id: 10, status: 'QUEUED', verdict: 'PENDING', message: '', case_results: [], type: 'submission_ack' }),
        queryResult: async () => ({ submission_id: 10, status: 'FINISHED', verdict: 'AC', message: 'ok', case_results: [], type: 'submission_finished' }),
      },
      {
        saveAck: async () => {
          calls.push('ack');
        },
        saveSnapshot: async (snapshot) => {
          calls.push(`snapshot:${snapshot.verdict}`);
        },
      },
    );

    expect(result.final.verdict).toBe('AC');
    expect(calls).toEqual(['ack', 'snapshot:AC']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test -- apps/judge-dispatcher/test/dispatcher.test.ts`
Expected: FAIL because dispatcher code does not exist

- [ ] **Step 3: Write minimal dispatcher orchestration**

```ts
export async function processSubmissionWithClient(submission, client, store) {
  const ack = await client.submit(submission);
  await store.saveAck(ack);
  const final = await client.queryResult(ack.submission_id);
  await store.saveSnapshot(final);
  return { ack, final };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd move_to_new_oj && npm test -- apps/judge-dispatcher/test/dispatcher.test.ts`
Expected: PASS

### Task 5: API Server

**Files:**
- Create: `move_to_new_oj/apps/api-server/package.json`
- Create: `move_to_new_oj/apps/api-server/tsconfig.json`
- Create: `move_to_new_oj/apps/api-server/src/app.ts`
- Create: `move_to_new_oj/apps/api-server/src/index.ts`
- Create: `move_to_new_oj/apps/api-server/src/views/problem.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/submission.pug`
- Create: `move_to_new_oj/apps/api-server/test/app.test.ts`

- [ ] **Step 1: Write the failing Fastify route test**

```ts
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';

describe('POST /api/submissions', () => {
  it('creates a pending submission', async () => {
    const app = buildApp({
      createSubmission: async () => ({
        id: 'sub-1',
        status: 'PENDING_DISPATCH',
        verdict: 'PENDING',
      }),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/submissions',
      payload: {
        pid: '1000',
        language: 'python',
        sourceCode: 'print(1)',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      submissionId: 'sub-1',
      status: 'PENDING_DISPATCH',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/app.test.ts`
Expected: FAIL because api server package does not exist

- [ ] **Step 3: Write minimal Fastify app**

```ts
app.post('/api/submissions', async (request, reply) => {
  const created = await services.createSubmission(request.body);
  return reply.code(201).send({
    submissionId: created.id,
    status: created.status,
    verdict: created.verdict,
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/app.test.ts`
Expected: PASS

### Task 6: End-to-End Local Run

**Files:**
- Modify: `move_to_new_oj/README.md`
- Create: `move_to_new_oj/.env.example`

- [ ] **Step 1: Write the failing documentation checklist**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('README local run section', () => {
  it('documents mongodb, api-server, dispatcher, and judge server setup', () => {
    const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
    expect(readme).toContain('docker run');
    expect(readme).toContain('npm run dev:api');
    expect(readme).toContain('npm run dev:dispatcher');
    expect(readme).toContain('judge_server');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/readme.test.ts`
Expected: FAIL because the readme test file and documented commands do not exist

- [ ] **Step 3: Add runbook and environment example**

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=roj_demo
JUDGE_SERVER_HOST=127.0.0.1
JUDGE_SERVER_PORT=8000
PORT=3000
```

- [ ] **Step 4: Run verification suite**

Run: `cd move_to_new_oj && npm test && npm run typecheck`
Expected: PASS

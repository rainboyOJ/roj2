# Judge Pipeline Design

## Scope

This document defines the first runnable slice of the new OJ project under `move_to_new_oj/`.
It implements the submission judging pipeline only:

- a minimal `api-server`
- a minimal `judge-dispatcher`
- MongoDB persistence
- reusable shared/db packages
- Pug pages for problem list, submit, and submission detail
- demo seed data instead of full registration/login/admin flows

Everything else stays explicitly out of scope for this slice:

- user self-registration
- session auth
- admin review
- problem management backend
- multi-judge scheduling

## Product Goal

From a fresh checkout, an operator should be able to:

1. start MongoDB
2. seed one demo problem and one demo user
3. run `api-server`
4. run `judge-dispatcher`
5. open a browser page
6. submit C++ or Python code to problem `1000`
7. see the submission move from pending to final verdict

## Architecture

The project will be an npm workspace rooted at `move_to_new_oj/`.

Workspace layout:

```text
move_to_new_oj/
  apps/
    api-server/
    judge-dispatcher/
  packages/
    db/
    judge-driver/
    shared/
  drivers/
    typescript/
```

### `packages/judge-driver`

This package owns the TypeScript driver code used to communicate with `judge_server`.
The runtime judging integration imports from `packages/judge-driver` so the app layer depends on a normal workspace package.

### `packages/shared`

Owns transport-neutral shared code:

- OJ submission status/verdict types
- Mongo document types
- DTOs returned by the API
- zod request/response schemas
- helpers for mapping judge snapshots into OJ status

### `packages/db`

Owns MongoDB integration:

- connection bootstrap
- collection getters
- index creation
- seed helpers
- submission lease acquisition/update helpers

### `apps/api-server`

Owns user-facing HTTP and Pug pages.

First slice pages:

- `/`
- `/problems`
- `/problem/:pid`
- `/submissions/:id`

First slice APIs:

- `GET /api/problems`
- `GET /api/problems/:pid`
- `POST /api/submissions`
- `GET /api/submissions/:id`
- `POST /api/dev/seed`

For this slice there is no real auth. `POST /api/submissions` accepts a `demoUserId` hidden field or defaults to the seeded demo user.

### `apps/judge-dispatcher`

Owns background judging:

- claim one pending submission with a Mongo lease
- send `submit` to `judge_server`
- store `judgeSubmissionId`
- poll `query_result`
- persist snapshots until terminal state
- clear lease when finished

The first version will run a simple loop in one process. No cron, queue system, or concurrent worker pool is required yet.

## Data Model

This slice creates the planned collections in reduced form:

### `users`

Only fields needed by seeded demo submissions:

- `_id`
- `username`
- `name`
- `role`
- `approvalStatus`
- `createdAt`
- `updatedAt`

### `problems`

- `_id`
- `pid`
- `title`
- `statementMarkdown`
- `allowLanguages`
- `isVisible`
- `createdAt`
- `updatedAt`

### `submissions`

- `_id`
- `userId`
- `problemId`
- `pid`
- `username`
- `displayName`
- `language`
- `sourceCode`
- `status`
- `verdict`
- `judge`
- `result`
- `createdAt`
- `updatedAt`

`judge` contains:

- `submissionId`
- `lastStatus`
- `lastMessage`
- `retryCount`
- `leaseOwner`
- `leaseExpireAt`
- `lastPolledAt`
- `ackAt`
- `finishedAt`

## Submission State Flow

Business states:

- `PENDING_DISPATCH`
- `SENT_TO_JUDGE`
- `JUDGING`
- `FINISHED`
- `FAILED`

Judge snapshot states are persisted separately from the business state:

- `QUEUED`
- `PREPARING`
- `COMPILING`
- `RUNNING`
- `FINISHED`
- `FAILED`

Transitions:

1. API creates a submission as `PENDING_DISPATCH`
2. dispatcher claims lease and moves to `SENT_TO_JUDGE`
3. successful `submission_ack` moves it to `JUDGING`
4. non-terminal `query_result` snapshots keep it in `JUDGING`
5. terminal snapshot moves it to `FINISHED` or `FAILED`
6. network/judge errors after retries move it to `FAILED`

## UI Design

The page layer is intentionally minimal and operational:

- `/problems` shows one table of visible problems
- `/problem/:pid` shows statement, language select, source editor textarea, submit button
- after submit, redirect to `/submissions/:id`
- `/submissions/:id` shows refreshed status, verdict, judge status, message, and case rows

The detail page will auto-refresh every 2 seconds while the submission is non-terminal using a tiny inline script.

## Error Handling

- Invalid `pid` returns `404`
- Unsupported language returns `400`
- hidden problems are excluded from the public list
- `JudgeServerError` payload is stored in `result.message`
- transient dispatcher failures increment `judge.retryCount`
- a stuck lease becomes reclaimable after timeout

## Testing Strategy

The first slice must include automated tests for:

1. submission creation validation
2. lease acquisition logic
3. judge snapshot to OJ state mapping
4. dispatcher processing with a fake judge client
5. API route behavior with Fastify injection

End-to-end verification after implementation:

1. run `npm install`
2. run workspace typecheck/tests
3. run a local MongoDB container
4. seed data
5. run `api-server`
6. run `judge-dispatcher`
7. submit to real `judge_server`

## Implementation Boundaries

This slice is intentionally opinionated:

- CommonJS compatibility is out of scope
- sessions are out of scope
- markdown rendering will be plain text or a tiny safe renderer, not a full editor stack
- problem data deployment stays manual and assumes judge-side `testData/1000/data` already exists

## Deliverables

When this slice is done, the repository should contain:

- runnable npm workspace config
- seeded demo data path
- minimal Pug-based api server
- minimal dispatcher worker
- automated tests for core judging pipeline
- updated README instructions for local run

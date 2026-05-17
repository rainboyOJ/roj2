# Content Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add submission listing, admin grade management, and admin problem management to the current OJ.

**Architecture:** Extend `packages/db` with grade/problem/submission listing helpers, then add admin/user routes and Pug pages in `api-server`.

**Tech Stack:** Node.js 22+, TypeScript, Fastify, Pug, MongoDB Node Driver, Vitest

---

### Task 1: Route Red Tests

**Files:**
- Create: `move_to_new_oj/apps/api-server/test/content-management.test.ts`

- [ ] **Step 1: Write failing tests for submission list and admin content routes**
- [ ] **Step 2: Run tests to verify they fail**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/content-management.test.ts`
Expected: FAIL because the routes and service hooks do not exist yet

### Task 2: DB Helpers

**Files:**
- Modify: `move_to_new_oj/packages/db/src/index.ts`

- [ ] **Step 1: Implement list/create/update helpers for grades, problems, and submissions**
- [ ] **Step 2: Re-run focused tests**

### Task 3: API And Pages

**Files:**
- Modify: `move_to_new_oj/apps/api-server/src/app.ts`
- Modify: `move_to_new_oj/apps/api-server/src/index.ts`
- Create: `move_to_new_oj/apps/api-server/src/views/submissions.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/admin-problems.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/admin-submissions.pug`

- [ ] **Step 1: Implement routes behind the failing tests**
- [ ] **Step 2: Run full verification**

Run: `cd move_to_new_oj && npm test && npm run typecheck`
Expected: PASS

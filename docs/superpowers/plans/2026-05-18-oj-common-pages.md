# OJ Common Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add common OJ pages for ranklist, contests, and admin problem editing while keeping Pico CSS and reusing current backend capabilities where possible.

**Architecture:** Reuse the server-rendered Fastify + Pug stack. Wire admin problem pages to real services, derive ranklist from submission data, and serve contests from placeholder server-side data until a real contest model exists.

**Tech Stack:** Fastify, Pug, MongoDB driver, TypeScript, Vitest, Pico CSS

---

### Task 1: Lock the new pages with failing tests

**Files:**
- Modify: `apps/api-server/test/views.test.ts`

- [ ] **Step 1: Add view tests for ranklist and contests**
- [ ] **Step 2: Add a view test for admin problem edit/create pages**
- [ ] **Step 3: Run `npm test -- apps/api-server/test/views.test.ts` and verify it fails**

### Task 2: Add backend view/service support

**Files:**
- Modify: `apps/api-server/src/app.ts`
- Modify: `apps/api-server/src/index.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Add service types for ranklist, contests, and admin problem detail**
- [ ] **Step 2: Add db helpers for ranklist summary and problem lookup**
- [ ] **Step 3: Add page routes for ranklist, contests, and admin problem edit/create**
- [ ] **Step 4: Add POST form routes for admin problem create/update/publish**

### Task 3: Build the new Pug pages

**Files:**
- Create: `apps/api-server/src/views/ranklist.pug`
- Create: `apps/api-server/src/views/contests.pug`
- Create: `apps/api-server/src/views/contest-detail.pug`
- Create: `apps/api-server/src/views/admin-problem-form.pug`
- Modify: `apps/api-server/src/views/layout.pug`
- Modify: `apps/api-server/src/views/home.pug`
- Modify: `apps/api-server/src/views/admin-problems.pug`

- [ ] **Step 1: Add nav entries for Ranklist and Contests**
- [ ] **Step 2: Build traditional OJ-style ranklist and contest list pages**
- [ ] **Step 3: Build admin problem create/edit form page**
- [ ] **Step 4: Update home/admin pages to link into the new flows**

### Task 4: Verify the slice

**Files:**
- Test: `apps/api-server/test/views.test.ts`
- Test: existing suites

- [ ] **Step 1: Run `npm test -- apps/api-server/test/views.test.ts`**
- [ ] **Step 2: Run `npm test`**
- [ ] **Step 3: Run `npm run typecheck`**

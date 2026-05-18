# Simple Learning UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing OJ pages a simple, unified learning-oriented visual style without changing the underlying product scope.

**Architecture:** Keep the backend routes unchanged and refactor only the Pug view layer into a shared layout plus reusable CSS. Avoid adding frontend build tooling; render all pages through server-side templates with one shared style include.

**Tech Stack:** Fastify, Pug, server-rendered HTML, Vitest

---

### Task 1: Lock in the new page shell with a failing view test

**Files:**
- Create: `apps/api-server/test/views.test.ts`
- Reference: `apps/api-server/src/app.ts`

- [ ] **Step 1: Write the failing test**

Add a view test that boots `buildApp(...)` with minimal fake services, requests `/problems`, and asserts the rendered HTML contains the shared shell markers such as `app-shell`, `app-nav`, and a page action link.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/api-server/test/views.test.ts`
Expected: FAIL because the current templates do not render the shared shell classes yet.

- [ ] **Step 3: Keep the assertions minimal**

The test should only assert stable structure, not full HTML snapshots, so later copy and spacing tweaks do not make it noisy.

- [ ] **Step 4: Re-run the same test after each template pass**

Run: `npm test -- apps/api-server/test/views.test.ts`
Expected: PASS once the shared layout is in place.

### Task 2: Build a shared learning-style layout

**Files:**
- Create: `apps/api-server/src/views/layout.pug`
- Create: `apps/api-server/src/views/styles.pug`

- [ ] **Step 1: Create a base layout**

Add a Pug layout that defines:
- document head
- responsive viewport meta
- inline shared CSS include
- top navigation
- centered content shell
- named blocks for content

- [ ] **Step 2: Add simple shared CSS**

Create one style partial with:
- light background
- readable typography
- restrained accent color
- card surfaces
- form/table/list spacing
- mobile-friendly widths

- [ ] **Step 3: Keep the style intentionally simple**

Avoid gradients, heavy motion, dense shadows, or dashboard-like chrome. Optimize for clarity and low visual noise.

### Task 3: Migrate all public pages to the shared layout

**Files:**
- Modify: `apps/api-server/src/views/problems.pug`
- Modify: `apps/api-server/src/views/problem.pug`
- Modify: `apps/api-server/src/views/submission.pug`
- Modify: `apps/api-server/src/views/submissions.pug`
- Modify: `apps/api-server/src/views/login.pug`
- Modify: `apps/api-server/src/views/register.pug`
- Modify: `apps/api-server/src/views/profile.pug`

- [ ] **Step 1: Convert each public page to `extends layout.pug`**

Move each page into the shared shell and add a heading block plus supporting copy where needed.

- [ ] **Step 2: Improve form readability**

Use labels, grouped fields, helper text, clear submit buttons, and textarea sizing that fits learning use.

- [ ] **Step 3: Improve list/detail readability**

Render problems and submissions as cards or simple rows with visible metadata and obvious links.

- [ ] **Step 4: Preserve existing behavior**

Do not change route names, form targets, or submission auto-refresh logic.

### Task 4: Migrate admin pages to the shared layout

**Files:**
- Modify: `apps/api-server/src/views/admin-users.pug`
- Modify: `apps/api-server/src/views/admin-problems.pug`
- Modify: `apps/api-server/src/views/admin-submissions.pug`

- [ ] **Step 1: Apply the same shell and spacing**

Admin pages should visually match the public pages while staying plain and utilitarian.

- [ ] **Step 2: Make data easier to scan**

Use simple list rows or lightweight tables with badges for statuses where helpful.

### Task 5: Verify the UI pass end-to-end

**Files:**
- Test: `apps/api-server/test/views.test.ts`
- Test: existing Vitest suite

- [ ] **Step 1: Run focused view test**

Run: `npm test -- apps/api-server/test/views.test.ts`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run type check**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Spot-check live rendering if needed**

If template regressions are suspected, start the app and request `/problems`, `/problem/1000`, and `/login` to confirm HTML renders successfully.

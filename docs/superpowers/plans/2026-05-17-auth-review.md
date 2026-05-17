# Auth And Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo-only submission path with a real student/admin auth flow backed by MongoDB sessions.

**Architecture:** Extend `packages/shared` and `packages/db` with full user/session models, then expand `api-server` routes and views to support register/login/logout/profile/admin review while preserving the existing judging pipeline.

**Tech Stack:** Node.js 22+, TypeScript 5/6, Fastify, Pug, MongoDB Node Driver, cookie-based server-side sessions, Vitest

---

### Task 1: Auth Route Red Tests

**Files:**
- Create: `move_to_new_oj/apps/api-server/test/auth.test.ts`
- Modify: `move_to_new_oj/apps/api-server/test/app.test.ts`

- [ ] **Step 1: Write failing tests for register/login/admin review**

```ts
expect(response.statusCode).toBe(201)
expect(response.headers['set-cookie']).toContain('roj_session=')
expect(response.statusCode).toBe(401)
expect(response.statusCode).toBe(403)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/auth.test.ts apps/api-server/test/app.test.ts`
Expected: FAIL because auth/session/admin routes do not exist yet

### Task 2: Shared And DB Auth Model

**Files:**
- Modify: `move_to_new_oj/packages/shared/src/index.ts`
- Modify: `move_to_new_oj/packages/db/src/index.ts`

- [ ] **Step 1: Add failing tests or route expectations that require real user/session data**

```ts
expect(user.approvalStatus).toBe('pending')
expect(session.token).toBeDefined()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/auth.test.ts`
Expected: FAIL because db/shared models cannot represent the new flow

- [ ] **Step 3: Implement user, grade, and session persistence**

```ts
await db.createUser(...)
await db.createSession(...)
await db.approveUser(...)
```

- [ ] **Step 4: Run focused tests**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/auth.test.ts`
Expected: auth-facing route tests move closer to green

### Task 3: API Server Auth Flow

**Files:**
- Modify: `move_to_new_oj/apps/api-server/src/app.ts`
- Modify: `move_to_new_oj/apps/api-server/src/index.ts`
- Create: `move_to_new_oj/apps/api-server/src/security.ts`

- [ ] **Step 1: Implement register/login/logout/profile/admin routes behind the failing tests**

```ts
app.post('/api/register', ...)
app.post('/api/login', ...)
app.post('/api/logout', ...)
app.get('/api/me', ...)
app.get('/api/admin/users', ...)
app.post('/api/admin/users/:id/approve', ...)
```

- [ ] **Step 2: Run route tests**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/auth.test.ts apps/api-server/test/app.test.ts`
Expected: PASS

### Task 4: Pug Pages And Navigation

**Files:**
- Create: `move_to_new_oj/apps/api-server/src/views/register.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/login.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/profile.pug`
- Create: `move_to_new_oj/apps/api-server/src/views/admin-users.pug`
- Modify: `move_to_new_oj/apps/api-server/src/views/*.pug`

- [ ] **Step 1: Add minimal page coverage after the route layer is green**

```ts
expect(response.statusCode).toBe(200)
expect(response.body).toContain('Register')
```

- [ ] **Step 2: Run tests**

Run: `cd move_to_new_oj && npm test -- apps/api-server/test/auth.test.ts`
Expected: PASS with page routes included

### Task 5: Seed And Docs

**Files:**
- Modify: `move_to_new_oj/apps/api-server/src/seed.ts`
- Modify: `move_to_new_oj/README.md`
- Modify: `move_to_new_oj/.env.example`

- [ ] **Step 1: Document default admin/demo credentials and session-backed flow**

```text
admin / admin123456
demo / demo123456
```

- [ ] **Step 2: Run full verification**

Run: `cd move_to_new_oj && npm test && npm run typecheck`
Expected: PASS

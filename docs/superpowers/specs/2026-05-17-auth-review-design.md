# Auth And Review Design

## Scope

This slice upgrades the current demo-only pipeline into a real multi-user flow:

- student registration
- login/logout
- MongoDB-backed server-side session
- profile page with approval state
- admin user review page
- submission creation gated by login + approval

Out of scope for this slice:

- password reset
- grade management UI
- class-name self-edit flow
- CSRF hardening
- code-visibility policy beyond the existing minimal submission page

## Product Goal

An operator should be able to:

1. seed an admin account and sample grades
2. open `/register` and create a student account
3. log in as admin and approve that account
4. log in as the student
5. submit code only after approval

## Data Model Changes

### `users`

Expand the existing document to include:

- `gender`
- `className`
- `grade`
- `passwordHash`
- `approvedBy`
- `approvedAt`
- `rejectedReason`

### `grades`

Add a new collection:

- `_id`
- `name`
- `isActive`
- `order`
- `createdAt`
- `updatedAt`

### `sessions`

Add a Mongo-backed session collection:

- `_id`
- `token`
- `userId`
- `expiresAt`
- `createdAt`
- `updatedAt`

The cookie stores only the opaque `token`. The authoritative session state lives in MongoDB.

## Auth Model

- Students register with `approvalStatus = pending`
- Pending students can log in and browse problems
- Pending students cannot submit
- Admin users can browse `/admin/users`
- Admin can approve or reject users
- Approved students can submit

## Runtime Architecture

No new process is introduced.

`api-server` gains:

- cookie parsing
- auth/session helpers
- register/login/logout/profile/admin routes

`judge-dispatcher` is unchanged except that submissions now come from authenticated users instead of the demo user fallback.

## Seed Strategy

Seed now creates:

- admin user `admin`
- password for local development documented in README
- one approved demo student
- three sample grades
- problem `1000`

This preserves fast local smoke testing while enabling the real register/review flow.

## UI

Pages added:

- `/register`
- `/login`
- `/profile`
- `/admin/users`

Existing pages gain a simple top nav with current user state and links.

## Testing

This slice must include automated tests for:

1. registration route validation
2. login route setting a session cookie
3. submission route rejecting anonymous users
4. submission route rejecting pending students
5. admin approval route authorization

## Deliverables

When complete, the repository should provide a minimal but real auth flow on top of the existing judging pipeline.

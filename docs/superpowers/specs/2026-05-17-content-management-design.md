# Content Management Design

## Scope

This slice fills the biggest remaining MVP gaps after auth and judging:

- submission list for logged-in users
- admin submission list
- grade management API
- problem management API
- admin problem/submission pages

Out of scope:

- markdown editor
- problem data file upload/sync
- password reset
- fine-grained code visibility policy

## Product Goal

An admin should be able to create and update problem metadata and maintain the grade list. A logged-in student should be able to inspect the submission list after using the judge flow.

## API Additions

User side:

- `GET /api/submissions`
- `GET /submissions`

Admin side:

- `GET /api/admin/submissions`
- `GET /admin/submissions`
- `GET /api/admin/grades`
- `POST /api/admin/grades`
- `PUT /api/admin/grades/:id`
- `GET /api/admin/problems`
- `POST /api/admin/problems`
- `PUT /api/admin/problems/:id`
- `POST /api/admin/problems/:id/publish`
- `GET /admin/problems`

## Access Rules

- `GET /api/submissions` requires login
- `GET /api/admin/*` requires admin
- Student submission list shows summary rows only
- Problem create/update/publish requires admin

## Data Layer

Add or expose db helpers for:

- list submissions
- list/create/update grades
- list/create/update/publish problems

## Deliverables

Minimal pages and JSON APIs for content management, with tests covering the main auth boundaries.

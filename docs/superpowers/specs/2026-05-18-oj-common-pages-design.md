# OJ Common Pages Design

## Scope

This slice expands the Pico-based UI into a more complete OJ page set using a mixed approach:

- real pages for ranklist, contests, and admin problem editing
- real admin problem data wired to existing APIs
- simplified ranklist derived from existing submission data
- contest pages rendered from server-side placeholder data

Out of scope:

- full contest database model
- contest registration rules
- scoreboard freeze logic
- problem markdown editor
- rich admin workflow such as draft/version history

## Product Goal

The application should look and behave more like a recognizable OJ. Users should be able to navigate from a shared top nav to common OJ pages, while admins should have a usable page for creating and editing problem metadata.

## Page Set

Add or revise these pages:

- `/`
- `/problems`
- `/problem/:pid`
- `/submissions`
- `/submissions/:id`
- `/ranklist`
- `/contests`
- `/contests/:id`
- `/login`
- `/register`
- `/profile`
- `/admin/problems`
- `/admin/problems/new`
- `/admin/problems/:id/edit`
- `/admin/users`
- `/admin/submissions`

## Data Strategy

### Ranklist

Use existing submission data only. First version ranking fields:

- username
- accepted count
- total submissions
- last accepted time

Ranking order:

1. higher accepted count first
2. lower wrong attempts first
3. earlier last accepted time first
4. username lexicographically as stable tie-break

This is intentionally simple and does not try to mimic ACM/ICPC or OI scoring exactly.

### Contests

Render a server-side placeholder list and detail view. These pages exist to complete the page system and navigation, not to introduce a full contest subsystem yet.

Each contest card/detail includes:

- id
- title
- status
- start/end text
- short description

### Admin Problem Editing

Use existing admin problem APIs and db helpers. The page layer should support:

- viewing all problems
- opening a new-problem form
- opening an edit form for one problem
- submitting create/update form posts
- publishing via a form button

## Backend Changes

Add page routes for:

- `GET /ranklist`
- `GET /contests`
- `GET /contests/:id`
- `GET /admin/problems/new`
- `GET /admin/problems/:id/edit`
- `POST /admin/problems`
- `POST /admin/problems/:id`
- `POST /admin/problems/:id/publish`

Add service methods for:

- ranklist summary retrieval
- admin problem lookup by internal id or pid
- contest placeholder retrieval

## UI Direction

Keep Pico CSS. Use traditional OJ information architecture:

- shared top nav
- list/table oriented pages
- simple side-free layouts
- obvious primary actions
- minimal decorative styling

## Testing

Add view tests for:

- home/nav still renders
- ranklist page renders
- contests page renders
- admin problem create/edit pages require admin and render forms

Keep existing auth and API tests passing.

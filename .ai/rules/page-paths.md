---
paths:
  - resources/js/pages/**
---

# Page Paths

Inertia pages are split by ownership at the top level of `resources/js/pages/`,
the same way `resources/js/components/` is:

- **`core/`** — Ciian's own control-panel pages. Everything that ships with the
  platform lives here: `auth/`, `settings/`, `system/`, `table/`, `component/`,
  `dashboard.tsx`, `error.tsx`, `welcome.tsx`.

The Inertia page **name** includes that folder, so a controller renders
`core/system/index`, not `system/index`. `Route::inertia()` and the error page in
`AppServiceProvider` use the same prefixed names, and the layout resolver in
`resources/js/app.tsx` matches on them (`core/welcome`, `core/auth/…`,
`core/settings/…`). Adding a page under a new top-level folder means teaching the
resolver about it.

Pages belonging to systems built inside Ciian do **not** go in `core/`. They get
their own root alongside it when that lands — do not mix them in.

Resource pages use a **singular** lowercase folder with standard action files:

```text
resources/js/pages/core/{resource}/index.tsx
resources/js/pages/core/{resource}/create.tsx
resources/js/pages/core/{resource}/update.tsx
resources/js/pages/core/{resource}/view.tsx
resources/js/pages/core/{resource}/show.tsx
```

Example for employees:

```text
resources/js/pages/core/employee/index.tsx
resources/js/pages/core/employee/create.tsx
resources/js/pages/core/employee/update.tsx
resources/js/pages/core/employee/view.tsx
resources/js/pages/core/employee/show.tsx
```

## Rules

- Use the singular resource name as the folder (`employee`, not `employees`).
- Prefer the standard action names: `index`, `create`, `update`, `view`, `show`.
- Only create the action files the feature needs — do not scaffold unused ones.
- Nested resources stay nested: `resources/js/pages/core/{parent}/{resource}/index.tsx`.
- Do **not** invent custom page names (`list`, `edit`, `details`, `form`, etc.) unless needed. If a custom name seems necessary, **ask first**.
- Existing non-resource pages (`core/auth/`, `core/settings/`, `core/dashboard.tsx`, `core/welcome.tsx`) keep their current paths; do not rename them to fit this pattern.

## Slug fields are derived from the name and never typed
Every slug input in a create form is `readOnly disabled` and auto-derives from the name field as it is typed — the system slug, a page's slug, a table's `tbl_db_name`, a role's slug. The user never edits a slug directly.

This is the pattern the Roles sheet, the Ciian settings panel and the table form already follow; a create page that lets a slug be hand-edited breaks it. The helper text under the field should say it is derived from the name.

The URL prefix on a system is not a slug and is not covered: it is typed by the user and never derived from the name, because it is the public URL rather than an internal identifier. Typed input is still normalized to URL-safe characters.

---
paths:
  - resources/js/pages/**
---

# Page Paths

Inertia pages live under `resources/js/pages/`. Resource pages use a **singular** lowercase folder with standard action files:

```text
resources/js/pages/{resource}/index.tsx
resources/js/pages/{resource}/create.tsx
resources/js/pages/{resource}/update.tsx
resources/js/pages/{resource}/view.tsx
resources/js/pages/{resource}/show.tsx
```

Example for employees:

```text
resources/js/pages/employee/index.tsx
resources/js/pages/employee/create.tsx
resources/js/pages/employee/update.tsx
resources/js/pages/employee/view.tsx
resources/js/pages/employee/show.tsx
```

## Rules

- Use the singular resource name as the folder (`employee`, not `employees`).
- Prefer the standard action names: `index`, `create`, `update`, `view`, `show`.
- Only create the action files the feature needs — do not scaffold unused ones.
- Nested resources stay nested: `resources/js/pages/{parent}/{resource}/index.tsx`.
- Do **not** invent custom page names (`list`, `edit`, `details`, `form`, etc.) unless needed. If a custom name seems necessary, **ask first**.
- Existing non-resource pages (`auth/`, `settings/`, `dashboard.tsx`, `welcome.tsx`) keep their current paths; do not rename them to fit this pattern.

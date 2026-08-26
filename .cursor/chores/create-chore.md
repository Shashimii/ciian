# Create a Chore Guide

Guide for authoring a new **chore guide** — a step-by-step, AI-followable recipe for recreating a feature in this project.

**Scope:** documentation only (produces a `.md` file in `.cursor/chores/`)

**Access:** anyone contributing feature guides.

**Dependencies:** none.

---

## What it does

A chore guide is a self-contained markdown file that lets an AI (or human) recreate a feature from scratch. Writing one means:

1. Capture the feature's scope, access rules, and dependencies up front.
2. Describe each layer (database, backend, frontend) in the order it should be built.
3. Reference concrete file paths, route names, and conventions used in this repo.
4. End with a verification checklist so the result can be confirmed.

A chore guide does NOT contain the actual implementation code base — it points to where code lives and shows representative snippets only.

---

## File layout

```text
.cursor/chores/
  create-chore.md        ← this meta-guide
  create-{feature}.md    ← one file per feature
```

Naming: `create-{kebab-case-feature-name}.md`. One feature per file.

---

## Prerequisites

| Guide | Why |
|-------|-----|
| _(none)_ | Chore guides are standalone; list real prerequisites when the feature depends on another chore. |

---

## 1. Front matter block

Start every chore with this header so scope is clear before any steps:

```markdown
# Create {Feature Name}

Guide for recreating the **{Feature Name}** — {one-line description}.

**Scope:** {frontend only | backend only | full stack}

**Access:** {roles allowed} — see role access documentation.

**Dependencies:** {list prerequisite chores or features}
```

---

## 2. "What it does" section

- State the primary route as `{METHOD} {path}`.
- List what an authenticated user of each role can do, as numbered steps.
- Explicitly note what the layer does NOT do, to bound the scope.

---

## 3. Layout diagram

Include an ASCII box diagram of the page or API shape so the structure is obvious at a glance:

```text
┌─────────────────────────────────────────────┐
│ Heading: {Title}                            │
├─────────────────────────────────────────────┤
│ {Section 1}                                 │
└─────────────────────────────────────────────┘
```

Note the layout primitives used (e.g. `AppLayout`, no outer `Card` wrapper).

---

## 4. Build steps (in order)

Document each layer the feature touches. Use only the sections that apply:

| Section | Contents |
|---------|----------|
| Database | Migration path, column table, model path. |
| Backend | Routes with middleware, Form Request, Service methods table, Controller path. |
| Frontend Types | `resources/js/types/{resource}.ts` shape. |
| Page Component | Inertia `Props` type + layout skeleton. |
| Components | Table of component name, path, and purpose. |

Prefer concrete paths and short representative snippets over full listings. Keep business logic in the Service, validation in the Form Request.

---

## 5. Verification checklist

Close every chore with a checklist so the outcome is testable, e.g.:

- [ ] Route protected by correct middleware
- [ ] Form Request validates all inputs
- [ ] Service contains business logic (not controller)
- [ ] Page uses shared layout + spacing conventions
- [ ] Wayfinder used for all links and form posts
- [ ] Role scoping enforced server-side

---

## Related

- `.cursor/context/overview.md` — the system's mission and conventions.
- `.cursor/rules/` — project rules the feature must respect.
- Sibling `create-{feature}.md` chores for prerequisite features.

# Ciian — System Context

The single source of truth for **what this system is and why it exists**. Read this first before implementing features.

---

## Mission

Ciian is a no-code platform for building full-fledged **web systems** — like Joomla, but far more powerful. Joomla thinks in primitive terms (e.g. "articles") and is mostly limited to blogs and simple websites. Ciian removes that ceiling: users visually assemble complete, data-driven applications without writing code.

**Primary goal:** Let a user create and run **multiple independent web systems** inside Ciian, entirely through a visual editor built from pre-styled Radix UI building blocks.

**Non-goals:**

- Not a blog/CMS limited to articles or static pages.
- Not a code editor — users build by clicking and dropping components, not by writing code.

---

## Access model

Access is split into two tiers: **platform-level** roles that govern Ciian itself, and **per-system UAC** that governs each created system independently.

### Platform roles (Ciian Backend / Control Panel)

Platform roles are **dynamic and stored in the database**. Operators can create roles and assign permissions to them.

**Default roles** (seeded, cannot be deleted; additional permissions can be attached later except where noted):

| Role | Can do |
|------|--------|
| Root | Full / root access to Ciian. Immutable — cannot be altered or deleted. |
| User (default) | No privileges. Access is limited to the **main index page** only. |

Custom roles can be added later with selected permissions. Assignment of users to roles is managed under Settings → Users.

### Per-system UAC

The user access control for each **created** system is managed in a separate control panel, specialized per system. Each system defines and enforces its own UAC independently of the platform roles above.

**Identity model:** there is a single account per user across all of Ciian. The same account carries **different permissions per system** — a user may have one set of privileges in System A and another (or none) in System B. Permissions are scoped to a system, not the identity.

### Main index page

The main index page is the **welcome page** and acts as the default system. It's where Root (and any custom roles with control-panel access) configure redirections and entry points to the systems that have been created. A plain `User` with no privileges can only reach this page.


---

## Core concepts

A **System** is a self-contained web application built inside Ciian. Each System is composed of:

| Concept | Description |
|---------|-------------|
| Database Tables | The data model backing the system. |
| UI Layouts | Page shells a page can be assigned to. |
| UI Components | Reusable, pre-styled Radix building blocks (tables/lists, forms, buttons, etc.). |
| Pages | The system's pages, wired together into the final app. |
| UAC | Per-system user access control, managed in its own dedicated control panel. |

### Dynamic component configuration (Joomla-style)

What is stored as JSON is the **component's configuration** — how a component/field is defined by the builder — **not** the data an end-user enters. This mirrors Joomla's flexible field storage: the configuration lives in a single `LONGTEXT`/`TEXT` column so components can define arbitrary fields without rigid, per-field schema migrations.

```text
Builder configures a component in the editor
   → Controller builds a PHP array of the component's config
   → json_encode($config)
   → stored in a LONGTEXT/TEXT column
```

```php
// Component/field configuration (PHP array)
['type' => 'text', 'color' => 'red', 'table_column' => 'user_name']

// json_encode() → stored value
"{\"type\":\"text\",\"color\":\"red\",\"table_column\":\"user_name\"}"
```

**End-user data is stored normally.** When an end-user of a built system fills out a form, that input is written to real columns/tables of the system's data model (e.g. the `user_name` column referenced by the config above) — not into the JSON blob. The JSON is metadata that describes how to render and where to store; the actual values are persisted conventionally.

### Builder experience

The editor is page-by-page, like a visual IDE:

1. Start a new **System**.
2. Create a **Page** inside it.
3. Select a **Layout** for the page.
4. Click-and-drop **Components** into the layout (table list, form, button, etc.).
5. Move on to the next page and repeat until the System is complete.

---

## Tech stack (verified)

| Layer | Technology |
|-------|------------|
| Backend | Laravel 13, PHP 8.3+ |
| Auth | Laravel Fortify (with WebAuthn/passkeys) |
| Frontend | Inertia.js v3 + React 19 |
| Styling | Tailwind CSS v4 |
| Routing (typed) | Laravel Wayfinder |
| Testing | Pest 4 |
| Tooling | Vite, Pint, Larastan, ESLint, Prettier |

---

## Conventions

- Business logic lives in **Actions** (`app/Actions/`, e.g. `PublishTable`, `SaveTableDraft`), stateless helpers and presenters in **Support** (`app/Support/`), validation in **Form Requests**, orchestration in thin **Controllers**. There is no `app/Services/` directory — do not create one.
- Frontend calls backend via **Wayfinder**-generated functions (no hardcoded URLs).
- Project rules live in `.ai/rules/`; feature recipes live in `.ai/chores/`.

---

## Related

- `.ai/rules/` — enforced project rules.
- `.ai/chores/` — step-by-step feature guides.

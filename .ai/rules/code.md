---
paths:
  - app/**
  - database/factories/**
  - database/migrations/**
---

# Code Conventions

## Model directories

Platform models live under `App\Models\Ciian`, grouped by concern:

- **`Ciian/Core`** — platform core config (`ciian_config`).
- **`Ciian/Database`** — Database Engine internals only (`ciian_int_tbl`). Do not put Core, System, Component, or Accounts models here.
- **`Ciian/System`** — created-system models (`ciian_sys`, `ciian_sys_tbl`).
- **`Ciian/Component`** — Component Engine only (`ciian_cmp`, etc.).
- **`Ciian/` root** — shared platform Accounts models (User, Role, Permission) until they get their own concern folder.

```text
app/Models/Ciian/Core/CiianConfig.php

app/Models/Ciian/Database/InternalTable.php

app/Models/Ciian/System/System.php
app/Models/Ciian/System/SystemTable.php

app/Models/Ciian/Component/Component.php

app/Models/Ciian/User.php
app/Models/Ciian/Role.php
app/Models/Ciian/Permission.php
```

Matching factories mirror the same concern folders:

```text
database/factories/Ciian/Core/...
database/factories/Ciian/Database/...
database/factories/Ciian/System/...
database/factories/Ciian/Component/...
database/factories/Ciian/UserFactory.php
```

**Generated** models (from publish) live under `app/Models/Systems/` and are **gitignored** — not committed:

```text
app/Models/Systems/{SystemStudly}/...   # created-system tables (e.g. PayrollSystem/RolesA.php)
app/Models/Systems/Ciian/...            # Ciian-tag tables created via Tables UI
```

Hand-written platform models stay tracked (`App\Models\User`, `App\Models\Ciian\Role`, etc.).

Do **not** put platform models back in `App\Models\` root.

## Controller & form request directories

Platform admin controllers and form requests mirror model concerns under `Ciian/`:

- **`Ciian/Database`** — Tables / Database Engine.
- **`Ciian/System`** — Systems / platform config.
- **`Settings/`** — user account settings (not under Ciian).

```text
app/Http/Controllers/Ciian/Database/TableController.php
app/Http/Controllers/Ciian/System/SystemController.php
app/Http/Controllers/Settings/...

app/Http/Requests/Ciian/Database/...
app/Http/Requests/Ciian/System/...
app/Http/Requests/Settings/...
```

## Internal vs system table shapes

- **Created systems:** `ciian_sys` + `ciian_sys_tbl` (`System` / `SystemTable`) — user tables owned by a created system (`system_id` required).
- **Ciian internal:** `ciian_int_tbl` (`InternalTable`) — seeded Accounts shapes plus any table created with System = Ciian (`tag=ciian`) from `CiianInternalTableSeeder` / Tables UI.
- Rows on `ciian_int_tbl` use a `tag` column (DB default `ciian`) and an `icon` column (DB default `Sparkles`) so ownership/grouping and badge icons are data-driven — filter with `InternalTable::tagged($tag)`, do not hardcode table slugs.
- Tables list also includes `ciian_sys_tbl` rows; those badges use the parent **system** icon, not `ciian_int_tbl.icon`.
- Do **not** store created-system tables in `ciian_int_tbl`; do **not** store Ciian-tagged tables in `ciian_sys_tbl`.
- Both table stores use `status`, `unpub_shape`, and `pub_shape`. Physical Laravel platform tables stay migration-backed; `unpub_shape` updates are metadata until publish copies them to `pub_shape` and the Database Engine applies DDL.
- Both table stores also carry `can_delete` (boolean, default `true`), checked by `App\Actions\Database\DeleteTable` before any drop. It is set once by seeders — `CiianInternalTableSeeder` seeds every row with `can_delete: false`, since all four are platform Accounts tables — and by nothing else in the app; no request handler, action, or UI control ever flips it. A `false` row can only become deletable again by a developer editing the column directly in the database. Never add a code path that toggles it.
- On publish, Ciian creates the physical table (including FK constraints) and generates an Eloquent model under `App\Models\Systems\{System|Ciian}\` with `belongsTo` / inbound `hasMany` from foreign key columns.

## Middleware naming

Middleware class and file names should be **simple and direct** — name what the middleware does, not a long conditional phrase.

Prefer short, readable names:

```text
CompleteSetupRedirect
UseFileSessionForSetup
EnsureUserHasPermission
HandleAppearance
```

Avoid verbose Laravel-doc style names:

```text
RedirectIfSetupComplete   ❌
RedirectIfAuthenticated   ❌ (prefer GuestRedirect / AuthRedirect if creating new ones)
EnsureEmailIsVerified     ❌ (prefer VerifiedEmail if creating new ones)
```

### Rules

- Use `StudlyCase` matching the filename (`CompleteSetupRedirect.php` → `CompleteSetupRedirect`).
- Prefer `{Subject}{Action}` or `{Action}{Subject}` over `If` / `Unless` conditionals in the class name.
- Keep names short enough to scan in `bootstrap/app.php` aliases and route groups.
- Existing vendor/framework middleware aliases (`auth`, `verified`, etc.) stay as Laravel provides them — this rule applies to **new app middleware** you create.

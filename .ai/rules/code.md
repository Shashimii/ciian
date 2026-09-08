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

Hand-written platform models stay tracked (`App\Models\Ciian\User`, `App\Models\Ciian\Role`, etc.).

Do **not** put platform models back in `App\Models\` root.

## Controller & form request directories

Platform admin controllers and form requests mirror model concerns under `Ciian/`:

- **`Ciian/Database`** — Tables / Database Engine.
- **`Ciian/System`** — Systems / platform config.
- **`Ciian/Component`** — Components / Component Engine.
- **`Settings/`** — user account settings (not under Ciian).

```text
app/Http/Controllers/Ciian/Database/TableController.php
app/Http/Controllers/Ciian/System/SystemController.php
app/Http/Controllers/Ciian/Component/ComponentController.php
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
- Both table stores also carry `can_delete` (boolean, default `true`). It is set once by seeders — `CiianInternalTableSeeder` seeds every row with `can_delete: false`, since all four are platform Accounts tables — and by nothing else in the app; no request handler, action, or UI control ever flips the column itself. Never add a code path that toggles it.
- `can_delete: false` blocks **delete only**, unconditionally — `App\Actions\Database\DeleteTable::handle()` refuses it before anything else runs, with no override, password included. The Tables UI matches this: the delete action shows a disabled lock icon with a "Protected Table" tooltip for these rows, not a clickable one. A protected row can only become deletable again by a developer clearing the column directly in the database.
- Sync (`PublishTable`) is a separate action and is **not** blocked by `can_delete` — a protected table can still be republished. What gates sync (and, separately, delete on a *non*-protected row) is root password confirmation: `TableController::destroyInternal`/`destroySystem` and `publishInternal`/`publishSystem` require the current user's password (`Hash::check`) whenever the target row is **currently published** — on either store, internal or created-system. An unpublished draft never needs this; nothing physical is at risk yet. The controller verifies, then passes a plain `true` into the action's `$confirmedPassword` param (`DeleteTable::handle()` / `PublishTable::handle()`'s `$confirmedDrops`), which trusts that flag rather than re-verifying — verification is the controller's job, not the action's.
- On publish, Ciian creates the physical table (including FK constraints) and generates an Eloquent model under `App\Models\Systems\{System|Ciian}\` with `belongsTo` / inbound `hasMany` from foreign key columns.
- A sync that fails partway is rolled back: DDL is not transactional on MySQL/MariaDB, so `PublishTable` calls `ApplyTableSchema::revert()` to put the table back on its published shape, keeping `pub_shape` and reality in agreement. Do not add a sync path that bypasses this — a stored shape that outlives the table it describes corrupts every later diff. Data in a column the failed sync already dropped is not recovered.
- **Renaming the physical table is not supported once published.** `ApplyTableSchema::sync()` refuses it, and the UI keeps `tbl_db_name` immutable: the slug input is `readOnly disabled` and only auto-derives from the name on create. Do not "fix" this by unlocking the slug.
- **Browsing and editing table rows is out of scope for the Database Engine.** This module manages schema only — shapes, publishing, DDL, generated models. Row-level CRUD is handled elsewhere in the platform; do not add data-browsing routes or UI under `/admin/tables`.

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

## System shapes publish metadata only — no cascade, no DDL
`ciian_sys` carries `status`, `color`, `unpub_shape` and `pub_shape` alongside `name`/`slug`/`icon`, mirroring the two table stores. The row columns are copied off the shape so the index lists without decoding JSON; the shape stays the source of truth.

`App\Support\SystemShapeBuilder` builds and validates it: `sys_name`, `sys_slug`, `icon`, `color`, `description`, `entry` (root-relative, defaults to `/s/{slug}`), plus `permissions` / `pages` / `components` reserved empty for the System Builder.

`App\Actions\System\PublishSystem::handle()` copies `unpub_shape` → `pub_shape` and sets `status=published` — nothing else. It does **not** publish the system's tables and never runs DDL: `ciian_sys_tbl` rows keep their own draft/published state and are published from the Tables module. Do not add a cascade; a system going live must stay a metadata-only operation. For the same reason a system publish/sync needs no root-password confirmation, unlike a table sync.

A system's slug is its live entry path, so it locks on publish: `SaveSystemDraft::update()` ignores a submitted slug once published (`UpdateSystemRequest::systemPayload()` strips it) and the UI marks the field read-only. Same rule as `tbl_db_name` on a published table — do not unlock it.

Deleting a system is not implemented; `ciian_sys` deliberately has no `can_delete` column.

## Every system owns a starting index page in ciian_sys_pg
Pages belong to a system, not to the platform: `ciian_sys_pg` (`App\Models\Ciian\System\Page`) with `system_id`, `name`, `slug`, `is_index`, `status`, `unpub_shape`, `pub_shape`, unique on `(system_id, slug)`.

**A system always has exactly one page with `is_index` set.** `SaveSystemDraft::create()` calls `SavePageDraft::createIndex()` inside the same transaction, so a system never exists without an entry point. That page keeps the slug `index` (`Page::INDEX_SLUG`), is served at the system root (`path` `/`, everything else `/{slug}`), and `DeletePage::handle()` refuses it outright. Do not add a code path that deletes it, renames its slug, or creates a system without it. `StorePageRequest`/`UpdatePageRequest` reserve the `index` slug so no ordinary page can claim it.

`PublishPage::handle()` mirrors `PublishSystem`: copy `unpub_shape` → `pub_shape`, set `status=published`, nothing else. A page going live never runs DDL.

`path` is derived from the slug in `PageShapeBuilder::normalize()` every time, never read back from storage, so a stored path cannot drift from the page it describes. A slug locks once the page is published (`SavePageDraft::slugIsLocked()`), and the index page's slug is locked always. When a still-unpublished system's slug changes, `SaveSystemDraft::update()` calls `SavePageDraft::reslugSystem()` so no page shape keeps pointing at the old `pg_sys`.

Pages are managed from the system's own manage page (`/admin/systems/{system}`), not a global admin module — the standalone Layouts module was removed for exactly that reason.

## Publishing a system page generates its file under resources/js/pages/{system}
A created system owns a folder named after its slug directly under `resources/js/pages/`, a sibling of Ciian's own `core/`, so its Inertia page name is `{system}/{page}` — e.g. `payroll/index`. `App\Support\SystemPagePath` resolves every path and name; do not build them by hand.

`App\Actions\System\GeneratePageFile` writes the TSX, the way `GenerateEloquentModel` writes a model on table publish. It is called from `PublishPage::handle()` (one page), `PublishSystem::handle()` (creates the folder and rewrites every already-published page), and `DeletePage::handle()` (removes the file). In each case the DB write commits first and the file follows: a row without its file regenerates on the next publish, while a file without a row is invisible and blocks reusing the slug.

These files are **build output**, gitignored via `/resources/js/pages/*` + `!/resources/js/pages/core`. Republishing overwrites them, so never hand-edit one or add tracked content to a system folder.

Two invariants keep the folder name honest. A system slug may not be a reserved top-level page folder — `SystemPagePath::RESERVED_FOLDERS` (currently `core`), enforced by `Rule::notIn` in both system requests. And renaming a still-unpublished system moves its folder: `SaveSystemDraft::update()` calls `GeneratePageFile::moveDirectory()` after the transaction, alongside the `reslugSystem()` call that fixes the shapes.

The layout resolver in `resources/js/app.tsx` returns `null` for any page name not starting with `core/`, so a generated system page is never wrapped in Ciian's admin shell. Keep that guard if you add page roots.

Not wired yet: nothing serves these files. `routes/systems.php` is still empty, so a generated page builds but has no route.

## A system's URL prefix is separate from its slug
A created system carries two identifiers and they are not interchangeable:

- **`slug`** (snake_case) is the internal identity. It names the generated page folder `resources/js/pages/{slug}/` and therefore the Inertia page name `{slug}/{page}`.
- **`prefix`** (lowercase, dashes or underscores) is the public URL. The system answers on `/{prefix}` directly at the top level — there is no shared `/s` namespace.

So a system slugged `payroll_system` with prefix `payroll` serves `/payroll` from the file `resources/js/pages/payroll_system/index.tsx`. Do not collapse the two; changing one must not silently change the other.

Because a prefix competes with every route Ciian registers, `App\Support\SystemUrlPrefix::RESERVED` lists the top-level segments the platform owns (`admin`, `settings`, `login`, `storage`, `s`, …) and both system form requests refuse them via `Rule::notIn`. Keep that list in step with the first segment of every route in `guest.php`, `settings.php` and `admin.php`. `routes/systems.php` is required last in `routes/web.php`, so a platform route wins a tie — but a colliding prefix would then be silently dead, which is why it is refused up front instead.

Both `slug` and `prefix` lock together when the system is published: `SaveSystemDraft::update()` ignores submitted values for either, `UpdateSystemRequest::systemPayload()` strips them, and the UI marks both read-only. The shape's `entry` is always derived from the prefix in `SystemShapeBuilder::normalize()`, never read back from storage.

## Deleting a system cascades to pages but never to tables
`App\Actions\System\DeleteSystem::handle()` removes a system and everything generated for it: the row (its `ciian_sys_pg` pages go with it through the cascading foreign key), the page folder `resources/js/pages/{slug}` via `GeneratePageFile::removeDirectory()`, and its entries in `routes/systems.php` via `GenerateSystemRoutes::handle()`. The row is deleted first, then the generated output — output without a row behind it is invisible and blocks reusing the slug, while a row without its files is harmless and regenerates.

**Tables are deliberately not cascaded.** `ciian_sys_tbl.system_id` cascades on delete, so letting a system go would silently remove the table metadata while its physical tables and generated Eloquent models stayed behind — the exact shape/reality mismatch the Database Engine rules exist to prevent. `DeleteSystem` therefore refuses outright while `$system->tables()` is non-empty and tells the user to delete them from the Tables module, where the DDL has its own confirmation and FK-reference checks. Do not add a cascade here.

Deleting a **published** system needs the current user's password: `SystemController::destroy()` verifies it with `Hash::check` and passes a plain `true` into `$confirmedPassword`, which the action trusts rather than re-verifying — the same split as `DeleteTable` and `PublishTable`. An unpublished draft serves nothing yet and needs no confirmation.

The Ciian platform row on the systems index is not a created system: the presenter marks it `can_delete: false` so its delete control renders as a disabled "Protected System" lock.

## A page cannot publish before its system does
`PublishPage::handle()` refuses outright while `$page->system` is unpublished, and `SystemIndexPresenter` reports `can_publish: false` for every page of an unpublished system so the row action does not appear.

The reason is that publishing a page writes real output named after things that are still moving: the file goes in `resources/js/pages/{system slug}/` and the route answers on the system's URL prefix, and both the slug and the prefix stay editable until the system is published. Letting a page go first would strand a file and a route under a name free to change.

That ordering removes a whole class of problem: **no page folder can exist while a system's slug is still editable**, so renaming a draft system never has generated files to move. `SaveSystemDraft::update()` therefore does no filesystem work at all — it only calls `SavePageDraft::reslugSystem()` to fix the stored shapes. Do not reintroduce a directory-move path here; if you find yourself needing one, the publish ordering has been broken somewhere.

Because the constraint hides the publish control rather than disabling it, the Pages section on the system manage page changes its description while the system is a draft, to say the system must be published first — a silently missing action is worse than a stated reason.

## Page blocks: what the builder stores and how a page renders it
A page shape's `blocks` key is the builder's output: an ordered list of `{block_id, component, props}`. `component` is a `ciian_cmp` slug and `props` are the values *that instance* was given — a component's own definition (its properties, defaults, TSX) is never copied into the page. `block_id` is stable across reordering and prop edits, so the builder can track a placed block without leaning on its index.

`PageShapeBuilder::normalizeBlocks()` is the only place blocks take canonical form and mints missing ids; `validate()` rejects a blank/malformed component slug or a duplicate `block_id`. Whether a slug actually exists is a DB question, so `SavePageDraft::saveBlocks()` checks it instead and refuses unknown components — a block pointing at nothing renders as a placeholder forever and is invisible in the page's own UI.

**Every rebuild of a page shape must carry the existing blocks through.** `SavePageDraft` rebuilds the whole shape on rename and on `reslugSystem()`, and before this contract existed those paths silently emptied the canvas. `buildShape()` now takes `$blocks` explicitly for that reason — never call it with `[]` from a path that is not creating a page.

Published pages render through `resources/js/components/core/block-renderer.tsx`, not generated imports: `GeneratePageFile` inlines the blocks as a `BLOCKS` const and hands them to `<BlockRenderer />`, which resolves each slug through `block-registry.ts` and lazy-loads it. A slug with no file in the current build renders a "Component not in this build" placeholder — that is a build staleness problem, not missing data. A page with no blocks still falls back to the placeholder landing screen.

Block props are stored as strings, matching how a component definition declares its defaults — **except a `checkbox` property, which is stored as a real boolean** so the component's prop can be typed `boolean` rather than the string `'false'`. That coercion belongs in the builder, which has the definition to consult; `BlockRenderer` has only the placed block, so it hands props to the component untouched and must never guess at their types.

## Every table Ciian owns carries the ciian_ prefix
Any physical table the platform owns is named `ciian_*`, including the four Accounts tables — `ciian_users`, `ciian_roles`, `ciian_permissions`, `ciian_permission_role`. The create migrations declare those names directly; there is no rename migration, and the bare Laravel names never exist at any point in the migration history.

Role protection uses `can_delete` (boolean, default `true`) like both table stores, not a `locked` flag. The polarity is inverted from the name it replaced: a protected role is `can_delete: false`.

The reason is namespace, not tidiness: table slugs are unique across `ciian_int_tbl` and `ciian_sys_tbl`, so any name the platform occupies is permanently unavailable to the systems built inside Ciian. Prefixing frees `users` / `roles` / `permissions` for them.

Consequences to keep in step when adding or renaming a platform table:
- The model needs an explicit `protected $table`; the bare Eloquent convention no longer matches.
- `belongsToMany` infers its pivot from model class names (`permission_role`), never the table, so a prefixed pivot must be passed explicitly — see `Role::permissions()` and `Permission::roles()`.
- `EloquentModelPath::PROTECTED` is keyed by physical table name. A stale key there stops the Database Engine recognising a hand-written model as protected, and a table publish can overwrite it.
- `CiianInternalTableSeeder` shapes carry both `slug` and `tbl_db_name` plus `table.column` foreign key references; all must use the prefixed names.
- Laravel infrastructure (`sessions`, `cache`, `jobs`, `password_reset_tokens`, `passkeys`) stays unprefixed by decision — it is config-driven, never appears in the Tables UI, and does not occupy the slug namespace.

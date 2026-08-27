# Create Table Create/Edit Pages

Guide for recreating the **Table create and edit pages** — full-height schema builders that define a table’s name, slug, system, columns, and JSON shape before publish.

**Scope:** full stack (pages + shared form + Form Requests + controller actions)

**Access:** authenticated + verified + `permission:artisyn_all` (same group as other Tables routes)

**Dependencies:** Tables index (`tables.index`), `artisyn_int_tbl` / `artisyn_sys_tbl` models, shape format in `.cursor/context/jsonshapes/db_table_format.md`, Systems list (for System select on create)

---

## What it does

Primary routes:

| Method | Path | Name | Purpose |
|--------|------|------|---------|
| `GET` | `/tables/create` | `tables.create` | New table form |
| `POST` | `/tables` | `tables.store` | Persist draft shape |
| `GET` | `/tables/{internalTable}/edit` | `tables.edit` | Edit internal table draft |
| `PUT` | `/tables/{internalTable}` | `tables.update` | Update draft shape |

Authenticated platform operators with Artisyn access can:

1. Open **New table** from the Tables index header action.
2. Set **Table Name** (slug auto-generated, read-only).
3. On create: pick **Table System** (No System, Artisyn, or a created system). On edit: System is locked.
4. Build columns in a builder (locked `id` column always present) with type-specific options.
5. Drag-reorder columns; select a column to edit properties.
6. Inspect / edit the live **Shape (JSON)** via Monaco (`JsonShapeEditor`); columns ↔ JSON stay in sync.
7. Submit **Create table** or **Save changes** (edit only when dirty).
8. Land back on Tables index with a success toast.

This layer does **NOT**:

- Publish DDL / generate Eloquent models (that is publish/sync).
- Edit system-table shapes via `tables.edit` (edit route is bound to `InternalTable` today).
- Replace the Tables index list UI.

---

## Layout diagram

```text
┌──────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Tables › New table | {Table name}   [Create|Save]   │
├──────────────┬───────────────────────────────────────────────────┤
│ System icon  │ Table Name                                        │
│ (locked)     │ Table Name Slug (read-only)  │ Table System       │
├──────────────┴────────────────┬──────────────────────────────────┤
│ Table Column Properties       │ Shape (JSON)                     │
│ ┌──────────────────────────┐  │ ┌──────────────────────────────┐ │
│ │ #  name     type     🗑  │  │ │ Monaco JsonShapeEditor       │ │
│ │ 1  id       id (locked)  │  │ │                              │ │
│ │ 2  email    string   ⋮   │  │ │ { tbl_name, tbl_db_name, … } │ │
│ │ [+ Add column]           │  │ │                              │ │
│ └──────────────────────────┘  │ └──────────────────────────────┘ │
│ Selected column options…      │                                  │
└───────────────────────────────┴──────────────────────────────────┘
```

Uses `AppLayout` via the global resolver. Page shell is `flex h-[calc(100svh-4rem)] … overflow-hidden` — no page `Heading`; primary submit lives in breadcrumb `headerActions`. Form uses `noValidate` + `InputError` (no HTML5 validation popups).

---

## Build steps (in order)

### Database

Already exists; do not invent a new table for this UI.

| Store | Model | Shape columns |
|-------|-------|---------------|
| `artisyn_int_tbl` | `App\Models\Artisyn\InternalTable` | `unpub_shape`, `pub_shape` |
| `artisyn_sys_tbl` | `App\Models\Artisyn\SystemTable` | `unpub_shape`, `pub_shape` |

Shape JSON contract: `.cursor/context/jsonshapes/db_table_format.md`.

Helpers:

- `App\Support\TableShapeBuilder` — normalize / compare shapes
- `App\Support\ColumnTypes` — allowed types + per-type options

---

### Backend

**Routes** (`routes/web.php`, inside `auth` + `verified` + `permission:artisyn_all`):

```php
Route::get('tables/create', [InternalTableController::class, 'create'])->name('tables.create');
Route::post('tables', [InternalTableController::class, 'store'])->name('tables.store');
Route::get('tables/{internalTable}/edit', [InternalTableController::class, 'edit'])->name('tables.edit');
Route::put('tables/{internalTable}', [InternalTableController::class, 'update'])->name('tables.update');
```

**Controller:** `app/Http/Controllers/InternalTableController.php`

| Action | Behavior |
|--------|----------|
| `create` | Inertia `table/create` + `relationTables` (published tables for FK picks) |
| `store` | `StoreInternalTableRequest::tablePayload()` → create `InternalTable` or `SystemTable`, flash toast, redirect `tables.index` |
| `edit` | Inertia `table/update` with `table` summary + `relationTables` |
| `update` | `UpdateInternalTableRequest::tablePayload()` → update `unpub_shape` (+ name/slug), toast, redirect index |

**Form Requests:**

| Class | Path |
|-------|------|
| `StoreInternalTableRequest` | `app/Http/Requests/StoreInternalTableRequest.php` |
| `UpdateInternalTableRequest` | `app/Http/Requests/UpdateInternalTableRequest.php` |
| Shared column rules | `app/Http/Requests/Concerns/ValidatesTableColumns.php` |

Validate at least: `name`, `slug` (`snake_case` regex + unique in the correct store), `columns` (min 1), `columns.*.name` / `type` (from `ColumnTypes::values()`), optional `timestamps`, create-only `system_id`. Build `unpub_shape` via `TableShapeBuilder` in `tablePayload()`.

After routes change: `php artisan wayfinder:generate --with-form --no-interaction`.

---

### Frontend types / libs

| Path | Purpose |
|------|---------|
| `@/lib/column-types` | Type catalog + `columnSupports` / `groupedColumnTypes` |
| `@/lib/format-shape-json-error` | Monaco / JSON parse error messaging |
| `@/lib/clear-field-errors` | Clear Inertia field errors on edit |
| `@/lib/system-icons` | System badge icons (`Sparkles`, `CircleDashed`, …) |

`TableFormValues` (exported from the form):

```ts
export type TableFormValues = {
  id: number;
  name: string;
  slug: string;
  tag: string;
  icon: string;
  shape: Record<string, unknown>;
};
```

---

### Page components

Singular folder: `resources/js/pages/table/`.

**Create** — `resources/js/pages/table/create.tsx`

- Props: `{ relationTables: Array<{ label: string; value: string }> }`
- Renders `<TableForm relationTables={…} />`
- Static `layout.breadcrumbs`: Tables → New table
- Wayfinder: `create`, `index` from `@/routes/tables`

**Update** — `resources/js/pages/table/update.tsx`

- Props: `{ table: TableFormValues; relationTables: … }`
- `setLayoutProps({ breadcrumbs })` in `useEffect` so the title uses live `table.name`
- Renders `<TableForm table={table} relationTables={…} />`
- Wayfinder: `edit`, `index` from `@/routes/tables`

Page chrome:

```tsx
<div className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden px-4 py-6">
  <TableForm … />
</div>
```

---

### Shared form component

**`TableForm`** — `resources/js/components/table-form.tsx`

Single component for create + edit (`table` prop optional → `isEditing`).

| Concern | Behavior |
|---------|----------|
| Submit | Inertia `<Form>` → `store` (create) or `update(id)` (edit); `noValidate` |
| Header actions | `setLayoutProps({ headerActions })` — Create table / Save changes (disabled when edit + not dirty) |
| Name → slug | `slugify` on name change; slug input read-only |
| System | Selectable on create; locked read-only badge/input on edit |
| Columns | Locked `id`; add / remove / drag reorder; select row for property panel |
| Shape sync | `shapeFromColumns` ↔ `columnsFromShape`; Monaco edits can rehydrate columns |
| Errors | `InputError` + `data-field` scroll-into-view; clear errors as fields change |

**Supporting UI:**

| Component | Path | Purpose |
|-----------|------|---------|
| `JsonShapeEditor` | `resources/js/components/json-shape-editor.tsx` | Monaco (`@monaco-editor/react`) JSON editor |
| Column type select | inside `table-form.tsx` | Searchable grouped types from `ColumnTypes` |
| Column properties panel | inside `table-form.tsx` | Type-specific options (length, FK `references`, etc.) |

Design rules to follow: design.mdc (validation clear-on-edit, no browser `confirm`, System pill badges, icon+name patterns where applicable).

---

## Verification checklist

- [ ] `GET /tables/create` and `GET /tables/{id}/edit` require auth + verified + Artisyn permission
- [ ] Create posts to `tables.store`; edit puts to `tables.update` via Wayfinder
- [ ] Form Requests validate name, slug, columns, and types; `tablePayload()` builds `unpub_shape`
- [ ] Create can target Artisyn / No System (`InternalTable`) or a system (`SystemTable`)
- [ ] Edit locks System; slug stays auto from name (read-only)
- [ ] Locked Auto Increment `id` column always present
- [ ] Column builder and Shape JSON stay in sync
- [ ] Submit button in breadcrumb `headerActions`; Save disabled when edit form is clean
- [ ] Success toast + redirect to `tables.index`
- [ ] Pages live at `table/create.tsx` and `table/update.tsx` (singular folder)
- [ ] No HTML5 validation popups (`noValidate` + `InputError`)

---

## Related

- `.cursor/context/jsonshapes/db_table_format.md` — shape JSON contract
- `.cursor/context/overview.md` — Systems / tables mission
- `.cursor/rules/page-paths.mdc` — `create` / `update` naming
- `.cursor/rules/design.mdc` — form, badge, and header conventions
- Tables index page / publish flow (separate from this chore)

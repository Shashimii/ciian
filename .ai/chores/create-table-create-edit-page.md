# Create Table Create/Edit Pages

Guide for recreating the **Table create and edit pages** — full-height schema builders that define a table’s name, slug, system, columns, and JSON shape before publish.

**Scope:** full stack (pages + shared form + Form Requests + controller actions)

**Access:** authenticated + verified + `permission:tables.manage` (same group as other Tables routes)

**Dependencies:** Tables index (`tables.index`), `ciian_int_tbl` / `ciian_sys_tbl` models, shape format in `.ai/shapes/db_table_format.md`, Systems list (for System select on create)

---

## What it does

Primary routes:

| Method | Path | Name | Purpose |
|--------|------|------|---------|
| `GET` | `/tables/create` | `tables.create` | New table form |
| `POST` | `/tables` | `tables.store` | Persist draft shape |
| `GET` | `/tables/{internalTable}/edit` | `tables.edit` | Edit internal table draft |
| `PUT` | `/tables/{internalTable}` | `tables.update` | Update draft shape |

Authenticated platform operators with the `tables.manage` permission can:

1. Open **New table** from the Tables index header action.
2. Set **Table Name** (slug auto-generated, read-only).
3. On create: pick **Table System** (Ciian, or a created system; `No System` is legacy and not offered on create). On edit: System is locked.
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
| `ciian_int_tbl` | `App\Models\Ciian\Database\InternalTable` | `unpub_shape`, `pub_shape` |
| `ciian_sys_tbl` | `App\Models\Ciian\System\SystemTable` | `unpub_shape`, `pub_shape` |

Shape JSON contract: `.ai/shapes/db_table_format.md`.

Helpers:

- `App\Support\TableShapeBuilder` — normalize / compare shapes
- `App\Support\ColumnTypes` — allowed types + per-type options

---

### Backend

**Routes** (`routes/admin.php`, under the `/admin` prefix, inside `auth` + `verified` + `permission:tables.manage`):

```php
Route::get('tables/create', [TableController::class, 'create'])->name('tables.create');
Route::post('tables', [TableController::class, 'store'])->name('tables.store');

Route::get('tables/internal/{internalTable}', [TableController::class, 'editInternal'])->name('tables.internal.edit');
Route::patch('tables/internal/{internalTable}', [TableController::class, 'updateInternal'])->name('tables.internal.update');

Route::get('tables/system/{systemTable}', [TableController::class, 'editSystem'])->name('tables.system.edit');
Route::patch('tables/system/{systemTable}', [TableController::class, 'updateSystem'])->name('tables.system.update');
```

**Controller:** `app/Http/Controllers/Ciian/Database/TableController.php`

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

- [ ] `GET /tables/create` and `GET /tables/{id}/edit` require auth + verified + `tables.manage`
- [ ] Create posts to `tables.store`; edit puts to `tables.update` via Wayfinder
- [ ] Form Requests validate name, slug, columns, and types; `tablePayload()` builds `unpub_shape`
- [ ] Create can target Ciian (`InternalTable`) or a system (`SystemTable`)
- [ ] Edit locks System; slug stays auto from name (read-only)
- [ ] Locked Auto Increment `id` column always present
- [ ] Column builder and Shape JSON stay in sync
- [ ] Submit button in breadcrumb `headerActions`; Save disabled when edit form is clean
- [ ] Success toast + redirect to `tables.index`
- [ ] Pages live at `table/create.tsx` and `table/update.tsx` (singular folder)
- [ ] No HTML5 validation popups (`noValidate` + `InputError`)

---

## Related

- `.ai/shapes/db_table_format.md` — shape JSON contract
- `.ai/context/overview.md` — Systems / tables mission
- `.ai/rules/page-paths.md` — `create` / `update` naming
- `.ai/rules/design.md` — form, badge, and header conventions
- Tables index page / publish flow (separate from this chore)

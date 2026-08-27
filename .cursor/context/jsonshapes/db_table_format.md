# Database Table Shape Format

This document explains the JSON Ciian stores for a **database table**.

That JSON lives in:

- `ciian_int_tbl` → `unpub_shape` / `pub_shape`
- `ciian_sys_tbl` → `unpub_shape` / `pub_shape`

It describes the **table schema** (columns, keys, timestamps). It does **not** store end-user row data, and it is **not** a UI component.

When you publish a table, Ciian reads this shape, updates the real database, and generates or updates an Eloquent model.

Related code:

- `App\Models\Ciian\Core\CiianConfig` — platform `sys_slug` / branding config
- `App\Models\Ciian\Database\InternalTable` — Ciian internal table shapes (seeded + UI-created)
- `App\Models\Ciian\System\*` — `System`, `SystemTable` (created-system tables)
- `App\Support\TableShapeBuilder` — builds and normalizes shapes
- `App\Support\ColumnTypes` — allowed column types and which options each type supports
- `App\Actions\Database\GenerateEloquentModel` — writes / merges Eloquent models on publish under `app/Models/Systems/` (gitignored)
- `App\Support\EloquentModelPath` — resolves model namespace/path for Ciian vs created systems

---

## Draft vs published

| Field | Meaning |
|-------|---------|
| `unpub_shape` | Working draft you edit in the Tables UI |
| `pub_shape` | Last version that was published to the database |

Until you publish (or sync), the draft can differ from what is live.

---

## What a shape looks like

At the top level, a shape always has a display name, a database table name, the owning system slug, a list of columns, and whether timestamps are included:

```json
{
  "tbl_name": "Users",
  "tbl_db_name": "users",
  "tbl_sys": "ciian",
  "columns": [],
  "timestamps": true
}
```

### Top-level fields

**`tbl_name`** (required)  
Friendly name shown in the UI, e.g. `"Users"`.

**`tbl_db_name`** (required)  
Real database table name in `snake_case`, e.g. `"users"`.

**`tbl_sys`** (required)  
Owning system slug:

- `ciian_config.sys_slug` for Ciian internal tables in `ciian_int_tbl`
- a created system’s `slug` for tables in `ciian_sys_tbl`

**`columns`** (required)  
Array of column objects (see next section).

**`timestamps`** (required)  
If `true`, Laravel adds `created_at` and `updated_at`.

**`primary`** (optional)  
List of column names that form a composite primary key. Use this when the table does not rely on a single `id` column (for example pivot tables).

**`physical_table`** (optional, legacy)  
Older alias for `tbl_db_name`. Prefer `tbl_db_name` in new shapes. Ciian still accepts this as a fallback when resolving the physical table name.

---

## Columns

Each item in `columns` is one database column.

The UI always keeps an `id` column (auto-increment primary key) unless you are using a special composite-primary setup.

Simple column:

```json
{
  "name": "email",
  "type": "string",
  "nullable": false,
  "unique": true
}
```

### Fields every column can use

**`name`**  
Column name in `snake_case` (e.g. `email`, `role_id`).

**`type`**  
Must be one of the keys below (from `ColumnTypes::DEFINITIONS`). Same ideas as Laravel blueprint types.

#### Numeric

| Type | Label | Extra properties |
|------|-------|------------------|
| `id` | ID | — |
| `increments` | Increments | — |
| `tinyIncrements` | Tiny Increments | — |
| `smallIncrements` | Small Increments | — |
| `mediumIncrements` | Medium Increments | — |
| `bigIncrements` | Big Increments | — |
| `integer` | Integer | `nullable`, `default`, `unsigned`, `autoIncrement` |
| `tinyInteger` | Tiny Integer | `nullable`, `default`, `unsigned`, `autoIncrement` |
| `smallInteger` | Small Integer | `nullable`, `default`, `unsigned`, `autoIncrement` |
| `mediumInteger` | Medium Integer | `nullable`, `default`, `unsigned`, `autoIncrement` |
| `bigInteger` | Big Integer | `nullable`, `default`, `unsigned`, `autoIncrement` |
| `unsignedInteger` | Unsigned Integer | `nullable`, `default`, `autoIncrement` |
| `unsignedTinyInteger` | Unsigned Tiny Integer | `nullable`, `default`, `autoIncrement` |
| `unsignedSmallInteger` | Unsigned Small Integer | `nullable`, `default`, `autoIncrement` |
| `unsignedMediumInteger` | Unsigned Medium Integer | `nullable`, `default`, `autoIncrement` |
| `unsignedBigInteger` | Unsigned Big Integer | `nullable`, `default`, `autoIncrement` |
| `decimal` | Decimal | `nullable`, `default`, `precision`, `scale`, `unsigned` |
| `float` | Float | `nullable`, `default`, `precision`, `scale`, `unsigned` |
| `double` | Double | `nullable`, `default`, `precision`, `scale`, `unsigned` |

For `decimal` / `float` / `double`:

- **`precision`** — total number of digits stored (before and after the decimal point).
- **`scale`** — how many of those digits are after the decimal point.

Example: `precision: 8`, `scale: 2` means up to 8 digits total, 2 after the decimal (so up to 6 before). Valid: `123456.78`. Too big: `1234567.89`.

#### Text

| Type | Label | Extra properties |
|------|-------|------------------|
| `string` | String | `nullable`, `default`, `length` |
| `char` | Char | `nullable`, `default`, `length` |
| `text` | Text | `nullable` |
| `tinyText` | Tiny Text | `nullable` |
| `mediumText` | Medium Text | `nullable` |
| `longText` | Long Text | `nullable` |

#### Boolean

| Type | Label | Extra properties |
|------|-------|------------------|
| `boolean` | Boolean | `nullable`, `default` |

#### Date & Time

| Type | Label | Extra properties |
|------|-------|------------------|
| `date` | Date | `nullable`, `default` |
| `dateTime` | DateTime | `nullable`, `default`, `precision`, `useCurrent`, `useCurrentOnUpdate` |
| `dateTimeTz` | DateTime (TZ) | `nullable`, `default`, `precision`, `useCurrent`, `useCurrentOnUpdate` |
| `time` | Time | `nullable`, `default`, `precision` |
| `timeTz` | Time (TZ) | `nullable`, `default`, `precision` |
| `timestamp` | Timestamp | `nullable`, `default`, `precision`, `useCurrent`, `useCurrentOnUpdate` |
| `timestampTz` | Timestamp (TZ) | `nullable`, `default`, `precision`, `useCurrent`, `useCurrentOnUpdate` |
| `year` | Year | `nullable`, `default` |

#### Binary & JSON

| Type | Label | Extra properties |
|------|-------|------------------|
| `binary` | Binary | `nullable` |
| `json` | JSON | `nullable`, `default` |
| `jsonb` | JSONB | `nullable`, `default` |

#### UUID & ULID

| Type | Label | Extra properties |
|------|-------|------------------|
| `uuid` | UUID | `nullable`, `default` |
| `ulid` | ULID | `nullable`, `default` |

#### Relationships

| Type | Label | Extra properties |
|------|-------|------------------|
| `foreignId` | Foreign ID | `nullable`, `references`, `onDelete` |
| `foreignUlid` | Foreign ULID | `nullable`, `references`, `onDelete` |
| `foreignUuid` | Foreign UUID | `nullable`, `references`, `onDelete` |

#### Specialty

| Type | Label | Extra properties |
|------|-------|------------------|
| `enum` | Enum | `nullable`, `default`, `values` |
| `set` | Set | `nullable`, `default`, `values` |
| `ipAddress` | IP Address | `nullable`, `default` |
| `macAddress` | MAC Address | `nullable`, `default` |
| `rememberToken` | Remember Token | — |
| `vector` | Vector | `nullable`, `dimensions` |
| `softDeletes` | Soft Deletes | `precision` |
| `softDeletesTz` | Soft Deletes (TZ) | `precision` |

#### Spatial

| Type | Label | Extra properties |
|------|-------|------------------|
| `geometry` | Geometry | `nullable` |
| `geography` | Geography | `nullable` |

`unique` and `indexed` can also appear on columns in shapes; they are not listed per type in `ColumnTypes` but are used by the table builder UI.

**`nullable`**  
Whether the column may be `NULL`.

**`default`**  
Default value when a row does not supply one (depends on type).

**`unique`**  
Whether the column must be unique.

**`indexed`**  
Whether the column gets a normal (non-unique) index.

### Extra fields (only when the type needs them)

Not every column uses every option. Only add what that type supports.

| Field | When you need it | What it means |
|-------|------------------|---------------|
| `auto_increment` | `id` / some integers | Value increases automatically |
| `length` | `string`, `char` | Max character length |
| `precision` | decimals / some dates | Numeric or time precision |
| `scale` | decimal / float / double | Digits after the decimal |
| `unsigned` | numbers | Disallow negative values |
| `use_current` | datetime / timestamp | Default to current time |
| `use_current_on_update` | datetime / timestamp | Refresh to current time on update |
| `values` | `enum`, `set` | Allowed choices, as a list of strings |
| `dimensions` | `vector` | Vector length |
| `references` | foreign keys | Target as `table.column`, e.g. `permissions.id` |
| `on_delete` | foreign keys | What happens if the parent row is deleted: `cascade`, `restrict`, `set_null`, or `no_action` |

---

## Examples

### Small table

A notes table with an id, a title, an integer, a decimal, and timestamps:

```json
{
  "tbl_name": "Notes",
  "tbl_db_name": "notes",
  "tbl_sys": "ciian",
  "columns": [
    {
      "name": "id",
      "type": "id",
      "nullable": false,
      "auto_increment": true
    },
    {
      "name": "title",
      "type": "string",
      "nullable": false
    },
    {
      "name": "priority",
      "type": "integer",
      "nullable": false,
      "default": 0,
      "unsigned": true
    },
    {
      "name": "score",
      "type": "decimal",
      "nullable": true,
      "precision": 8,
      "scale": 2
    }
  ],
  "timestamps": true
}
```

### Users (Accounts seeder shape)

```json
{
  "tbl_name": "Users",
  "tbl_db_name": "users",
  "tbl_sys": "ciian",
  "columns": [
    {
      "name": "id",
      "type": "id",
      "nullable": false,
      "auto_increment": true
    },
    {
      "name": "username",
      "type": "string",
      "nullable": false,
      "unique": true
    },
    {
      "name": "email",
      "type": "string",
      "nullable": false,
      "unique": true
    },
    {
      "name": "role_id",
      "type": "foreignId",
      "nullable": false,
      "references": "roles.id",
      "on_delete": "restrict"
    },
    {
      "name": "email_verified_at",
      "type": "timestamp",
      "nullable": true
    },
    {
      "name": "password",
      "type": "string",
      "nullable": false
    },
    {
      "name": "two_factor_secret",
      "type": "text",
      "nullable": true
    },
    {
      "name": "two_factor_recovery_codes",
      "type": "text",
      "nullable": true
    },
    {
      "name": "two_factor_confirmed_at",
      "type": "timestamp",
      "nullable": true
    },
    {
      "name": "remember_token",
      "type": "rememberToken",
      "nullable": true
    }
  ],
  "timestamps": true
}
```

### Pivot table with foreign keys

No single `id`. The primary key is the pair of foreign keys:

```json
{
  "tbl_name": "Permission Role",
  "tbl_db_name": "permission_role",
  "tbl_sys": "ciian",
  "columns": [
    {
      "name": "permission_id",
      "type": "foreignId",
      "nullable": false,
      "references": "permissions.id",
      "onDelete": "cascade"
    },
    {
      "name": "role_id",
      "type": "foreignId",
      "nullable": false,
      "references": "roles.id",
      "onDelete": "cascade"
    }
  ],
  "primary": ["permission_id", "role_id"],
  "timestamps": false
}
```

**Note on naming:** some existing seed data uses `onDelete` (camelCase). New shapes should prefer `on_delete`. Ciian accepts both when building.

### Enum column (single column snippet)

```json
{
  "name": "status",
  "type": "enum",
  "nullable": false,
  "default": "draft",
  "values": ["draft", "published", "archived"]
}
```

`values` is the closed list of allowed strings for that column.

---

## Rules to remember

1. **`tbl_db_name`** must be a valid `snake_case` table name.
2. **`tbl_sys`** must be the owning system slug (`ciian_config.sys_slug` for Ciian internals, or a created system’s `slug` for system tables).
3. **Column `name`** values must be `snake_case`.
4. **`type`** must be one of the keys in `ColumnTypes::DEFINITIONS`.
5. This JSON is **schema only** — never put user row content here.
6. Edits go to **`unpub_shape`**. The live database follows **`pub_shape`** after publish/sync.

# Component Shape Format

> **Status: partly implemented.**
>
> **Exists:** the `ciian_cmp` table, `App\Models\Ciian\Component\Component` (with `definition()`), `Database\Seeders\CiianComponentSeeder` seeding the Button block, `ComponentFactory`, the `components.manage` permission, a read-only index at `/admin/components`, an upload page at `/admin/components/create`, and the `resources/js/components/` split into `core/`, `default/`, `custom/` and `ui/`.
>
> **Does not exist yet:** the upload endpoint itself — nothing is parsed, validated, generated or saved server-side. And **nothing renders a component from its stored `tsx` yet**; how that source becomes a live React component is still an open decision.
>
> Treat the rest of this document as the design contract, not as a description of current behaviour.

This document describes the **component definition**: a UI building block's acknowledgement, identity, editable properties, and TSX source. It does **not** cover the prop values a page sets when it places a block — those live with the page instance.

A definition is **authored as YAML** and **stored as JSON**.

---

## Why YAML for authoring

A component is code, so there is no builder UI — a developer writes the component and uploads its definition. JSON has no multi-line string syntax, which would force the entire TSX source onto one line with every newline escaped as `\n`: unreadable, undiffable, and impossible to lint.

YAML's `|` block scalar keeps the source exactly as written — newlines, quotes and indentation intact, no escaping. `symfony/yaml` is already installed (Laravel depends on it), so this needs no new package.

Once parsed, the definition is an ordinary PHP array and is stored as JSON in `unpub_shape` / `pub_shape`, which are `array`-cast `longText` columns. **YAML is the upload format; JSON is the storage format.** Nothing reads YAML out of the database.

A worked example lives at `.ai/shapes/cmp_example.yaml`.

---

## Row vs shape

Each `ciian_cmp` row has table columns **and** a shape JSON:

| DB column | Meaning |
|-----------|---------|
| `name` | Display name (e.g. `Button`) |
| `slug` | Stable unique id (e.g. `button`) |
| `type` | `"block"` for building blocks |
| `status` | `unpublished` / `published` |
| `can_delete` | `false` for seeded default blocks, which ship with the platform and may already be placed on pages |
| `unpub_shape` | Working draft definition |
| `pub_shape` | Last published definition |
| `thumbnail` | Optional preview image path |

`name`, `slug` and `can_delete` are **copied onto the row** from the definition's `information` block so the index can list and filter without decoding every shape. The definition remains the source of truth.

---

## Draft vs published

| Field | Meaning |
|-------|---------|
| `unpub_shape` | Working draft |
| `pub_shape` | Last published version used for rendering / property panels |

`Component::definition()` returns `pub_shape` when published, otherwise `unpub_shape`.

---

## What a definition looks like

Four top-level keys, all required:

```yaml
creator: Shashimii

information:
    name: Submit Button
    slug: submit_button
    category: forms
    can_delete: true

properties:
    label:
        type: string
        label: Label
        default: Submit

tsx: |
    import { Button } from '@/components/ui/button';

    export default function SubmitButton({ label }: { label: string }) {
        return <Button type="submit">{label}</Button>;
    }
```

---

## `creator`

Free text crediting whoever wrote the component. Shown for acknowledgement; carries no behaviour and is never parsed.

---

## `information`

Identity for the palette and the `ciian_cmp` row.

**`name`** (required)
Friendly name shown in the UI, e.g. `Submit Button`.

**`slug`** (required)
Stable id, `snake_case` (`^[a-z][a-z0-9_]*$`). Must be **unique across `ciian_cmp`** — an upload reusing an existing slug is rejected rather than merged. It also names the generated file, so `submit_button` produces `resources/js/components/custom/submit_button.tsx`.

**`category`** (required)
Palette group, e.g. `application`, `forms`, `content`, `layout`.

**`can_delete`** (required, boolean)
Whether the block may be deleted from the Components UI. Seeded default blocks use `false`.

> **Uploads must not be trusted to set this.** An uploader marking their own component `can_delete: false` would make it permanently undeletable through the UI. The upload endpoint should force `true` and reserve `false` for seeders.

**`description`** (optional)
Short help text. The Components index renders it under the name.

Note there is **no `component` path field**. Ciian derives the module path from the slug and the folder it generates into, so a stored path can never disagree with where the file actually is.

---

## `properties`

Keys are the **prop names** passed into the React component. Values describe the builder's property panel.

```yaml
properties:
    variant:
        type: select
        label: Variant
        default: default
        options:
            - default
            - destructive
            - outline
    loading:
        type: checkbox
        label: Show loading state
        default: 'false'
```

### Fields every property can use

**`type`** (required)

| Type | UI control | Notes |
|------|------------|-------|
| `string` | Text input | Single-line |
| `text` | Textarea | Multi-line |
| `select` | Dropdown | Requires `options` |
| `checkbox` | Checkbox | `default` is `'true'` / `'false'` |

**`label`** (required)
Label shown above the control.

**`default`** (required)
Starting value when the block is first placed. **Always stored as a string**, booleans included.

> Quote any default that YAML would read as a keyword — `'false'`, `'true'`, `'null'`, `'on'`, `'off'`, `'yes'`, `'no'` — or it parses as a boolean and the shape ends up with the wrong type. The upload endpoint should cast defaults back to strings rather than trusting the parsed type.

**`options`** (required for `select`)
Closed list of allowed string values.

### Rules

1. Property **keys** must match the prop names the TSX destructures — exactly, and with nothing left over on either side.
2. Each `default` must match that prop's default in the TSX.
3. Do not put page-instance override values here — only definition defaults.

---

## `tsx`

The component's full source, written under a `|` block scalar as ordinary multi-line TSX.

Rules for the source:

- Must export a **default** component.
- Props must align with `properties` keys.
- Prefer existing `@/components/ui/*` primitives so the block inherits theming and dark mode.
- Avoid dynamic Tailwind class construction (`` `bg-${color}` ``) — those classes never reach the compiled stylesheet. Use fixed class maps or UI variants.

Two things about the block scalar itself:

- **Indentation defines the block.** Everything indented under `tsx:` belongs to it; the indent is stripped uniformly. Mixed tabs and spaces produce a parse error, so report that clearly rather than letting it surface as a stack trace.
- **The uploader's formatting is not authoritative.** Run the generated file through Prettier before writing it, or `components/custom/` drifts from the formatting every other file in the repo follows.

---

## Page instance (not stored in this shape)

When a user places a block on a page, the page stores an **instance**, not a definition:

```json
{
  "slug": "submit_button",
  "props": {
    "label": "Save",
    "variant": "default"
  }
}
```

`slug` points at `ciian_cmp`. `props` overrides definition defaults for that placement only.

---

## Upload flow

1. A developer uploads a `.yaml` / `.yml` definition at `/admin/components/create`.
2. The server parses it with `symfony/yaml`, reporting a parse error against the offending line.
3. It validates the four top-level keys, `information`, every property, and the TSX (see Validation below).
4. It writes `resources/js/components/custom/{slug}.tsx`, Prettier-formatted.
5. It creates the `ciian_cmp` row, copying `name`, `slug` and `can_delete` onto it and storing the parsed definition as the shape.

The client mirrors the validation for fast feedback. That mirror is a convenience, **never a substitute** — an uploaded file is entirely user-controlled, so the server must re-run every check.

The upload page deliberately does **not** render the component before it is saved. Doing so would mean compiling the uploaded TSX in the operator's browser, which needs a runtime transpiler and executes untrusted source earlier than it has to. Preview happens after upload instead, once the file exists on disk and the bundler has picked it up. Do not add a pre-upload live preview without revisiting that trade-off.

### Validation

| Check | Rule |
|-------|------|
| `creator` | Non-empty string |
| `information.name` | Non-empty string |
| `information.slug` | `^[a-z][a-z0-9_]*$`, unique on `ciian_cmp` |
| `information.category` | Non-empty string |
| `information.can_delete` | Boolean; forced to `true` for uploads |
| `properties` | Map; may be empty |
| each property | Known `type`, non-empty `label`, `default` present, `options` array when `type: select` |
| property keys | Match the props the TSX destructures |
| `tsx` | Non-empty, exports a default component |

### Security

Uploaded TSX is **arbitrary code written to disk and bundled into the application**. It runs with the same privileges as first-party code. Restrict the endpoint to trusted operators — `components.manage` is the gate, and it should stay a Root-level permission. Never expose uploading to ordinary system users.

---

## Rules to remember

1. Author in **YAML**; the database stores **JSON**. Never read YAML back out of a row.
2. `slug` must be stable and unique on `ciian_cmp`, and it names the generated file.
3. `properties` keys must match the TSX prop names, and defaults must match the TSX defaults.
4. Defaults are **strings** — quote `'false'` and `'true'`.
5. Never let an upload set `can_delete: false`.
6. This YAML is **configuration and source**, not end-user form data.
7. Edits go to `unpub_shape`; live consumers prefer `pub_shape` after publish.
8. Default blocks are seeded into `components/default/`; uploads are generated into `components/custom/`, which is gitignored.

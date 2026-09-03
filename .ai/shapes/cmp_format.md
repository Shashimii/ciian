# Component Shape Format

> **Status: partly implemented.**
>
> **Exists:** the `ciian_cmp` table, `App\Models\Ciian\Component\Component` (with `definition()`), `Database\Seeders\CiianComponentSeeder` seeding the Button block, `ComponentFactory`, the `components.manage` permission, and a read-only index at `/admin/components` (`resources/js/pages/component/index.tsx`).
>
> **Does not exist yet:** any publish/sync engine, shape validation, editing or upload UI, and `resources/js/components/blocks/`. Crucially, **nothing renders a component from its stored `tsx` yet** — how that source becomes a live React component (generate a file on publish, compile in the browser, or ship checked-in blocks) is still an open decision. Until it is made, `info.component` is metadata only.
>
> Treat the rest of this document as the design contract, not as a description of current behaviour.

This document explains the JSON Ciian stores for a **UI building-block component**.

That JSON lives in:

- `ciian_cmp` → `unpub_shape` / `pub_shape`

It is the **component definition** (identity, editable properties, and TSX source). It does **not** store page-instance prop values (those live on the page when a block is placed).

Default building blocks are seeded from `Database\Seeders\CiianComponentSeeder`. Custom components uploaded by developers must follow this same shape.

Related code:

- `App\Models\Ciian\Component\Component` — model (`type = block` for building blocks)
- `resources/js/components/blocks/` — generated / checked-in TSX for default blocks
- `resources/js/pages/component/index.tsx` — Components index / previews

---

## Row vs shape

Each `ciian_cmp` row has table columns **and** a shape JSON:

| DB column | Meaning |
|-----------|---------|
| `name` | Display name (e.g. `Button`) |
| `slug` | Stable unique id (e.g. `button`) |
| `type` | `"block"` for building blocks |
| `status` | `unpublished` / `published` |
| `can_delete` | `false` for seeded default blocks, which ship with the platform and may already be placed on pages. Mirrors the same column on the table stores. |
| `unpub_shape` | Working draft definition |
| `pub_shape` | Last published definition |
| `thumbnail` | Optional preview image path |

The **shape** (definition) is what this document describes. Upload / seed payload:

```text
name + slug + definition{ info, properties, tsx }
```

`tsx` is **inside** `definition`, not a separate top-level DB column.

---

## Draft vs published

| Field | Meaning |
|-------|---------|
| `unpub_shape` | Working draft |
| `pub_shape` | Last published version used for rendering / property panels |

`Component::definition()` returns `pub_shape` when published, otherwise `unpub_shape`.

---

## What a definition looks like

At the top level, a definition always has `info`, `properties`, and `tsx`:

```json
{
  "info": {
    "name": "Button",
    "slug": "button",
    "category": "application",
    "description": "Clickable action control",
    "component": "@/components/blocks/button"
  },
  "properties": {
    "label": {
      "type": "string",
      "label": "Label",
      "default": "Button"
    }
  },
  "tsx": "<see TSX section — author as normal multi-line source>"
}
```

---

## `info`

Identity and load metadata for the palette / registry.

**`name`** (required)  
Friendly name shown in the UI, e.g. `"Button"`.

**`slug`** (required)  
Stable id in `snake_case` / kebab-safe form, e.g. `"button"`. Should match the `ciian_cmp.slug` column.

**`category`** (required)  
Palette group slug, e.g. `"application"`, `"forms"`, `"content"`.

**`description`** (optional)  
Short help text for the Components index / palette.

**`component`** (optional)  
Module path used when a real TSX file exists on disk, e.g. `"@/components/blocks/button"`.

---

## `properties`

Object whose **keys are prop names** passed into the React component. Values describe the page-builder property panel.

```json
{
  "label": {
    "type": "string",
    "label": "Label",
    "default": "Button"
  },
  "purpose": {
    "type": "select",
    "label": "Purpose",
    "default": "button",
    "options": ["button", "submit", "reset"]
  }
}
```

### Fields every property can use

**`type`** (required)  
Control type for the property panel:

| Type | UI control | Notes |
|------|------------|-------|
| `string` | Text input | Single-line |
| `text` | Textarea | Multi-line |
| `select` | Dropdown | Requires `options` |

**`label`** (required)  
Label shown above the control.

**`default`** (required)  
Starting value when the block is first placed on a page. Stored as a string in the shape (booleans as `"true"` / `"false"` when needed).

**`options`** (required for `select`)  
Closed list of allowed string values.

### Rules

1. Property **keys** must match prop names in the TSX component.
2. Defaults should match the destructured defaults in `tsx`.
3. Do not put page-instance override values here — only the definition defaults.

---

## `tsx`

Full React / TSX source for the component. Author it as **normal multi-line TSX** (same as a `.tsx` file).

In PHP seeders, use a heredoc so it stays readable:

```php
'tsx' => <<<'TSX'
import { Button } from '@/components/ui/button';

export default function BlockButton({ label }: { label: string }) {
  return <Button>{label}</Button>;
}
TSX,
```

When that array is stored in `unpub_shape` / `pub_shape`, Laravel JSON-encodes it — `tsx` becomes one string value with real newlines (not something you hand-escape with `\n`).

Rules for the source itself:

- Must export a default component.
- Props must align with `properties` keys.
- Prefer existing `@/components/ui/*` primitives for styling consistency.
- Avoid dynamic Tailwind class construction (e.g. `` `bg-${color}` ``); use fixed class maps or UI variants instead.

---

## Page instance (not stored in this shape)

When a user places a block on a page, the page stores an **instance**, not a new definition:

```json
{
  "slug": "button",
  "props": {
    "label": "Save",
    "purpose": "submit",
    "variant": "default",
    "size": "default"
  }
}
```

`slug` points at `ciian_cmp`. `props` overrides definition defaults for that placement only.

---

## Example — Button building block (import-ready)

Matches `CiianComponentSeeder::buttonBlock()`.

```json
{
  "info": {
    "name": "Button",
    "slug": "button",
    "category": "application",
    "description": "Clickable action control",
    "component": "@/components/blocks/button"
  },
  "properties": {
    "label": {
      "type": "string",
      "label": "Label",
      "default": "Button"
    },
    "purpose": {
      "type": "select",
      "label": "Purpose",
      "default": "button",
      "options": ["button", "submit", "reset"]
    },
    "variant": {
      "type": "select",
      "label": "Variant",
      "default": "default",
      "options": [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link"
      ]
    },
    "size": {
      "type": "select",
      "label": "Size",
      "default": "default",
      "options": ["default", "sm", "lg"]
    }
  },
  "tsx": "import { Button } from '@/components/ui/button';\n\nexport type BlockButtonProps = {\n  label: string;\n  purpose?: 'button' | 'submit' | 'reset';\n  variant?:\n    | 'default'\n    | 'destructive'\n    | 'outline'\n    | 'secondary'\n    | 'ghost'\n    | 'link';\n  size?: 'default' | 'sm' | 'lg';\n};\n\nexport default function BlockButton({\n  label,\n  purpose = 'button',\n  variant = 'default',\n  size = 'default',\n}: BlockButtonProps) {\n  return (\n    <Button type={purpose} variant={variant} size={size}>\n      {label}\n    </Button>\n  );\n}\n"
}
```

Same `tsx` value typed normally:

```tsx
import { Button } from '@/components/ui/button';

export type BlockButtonProps = {
  label: string;
  purpose?: 'button' | 'submit' | 'reset';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg';
};

export default function BlockButton({
  label,
  purpose = 'button',
  variant = 'default',
  size = 'default',
}: BlockButtonProps) {
  return (
    <Button type={purpose} variant={variant} size={size}>
      {label}
    </Button>
  );
}
```

---

## Custom upload checklist

Developers uploading a custom component must include:

1. **`name`** and **`slug`** on the `ciian_cmp` row  
2. **`definition`** with:
   - **`info`**
   - **`properties`**
   - **`tsx`**

---

## Rules to remember

1. **`slug`** must be stable and unique on `ciian_cmp`.
2. **`properties` keys** must match TSX prop names.
3. **`tsx`** is authored as normal multi-line source (heredoc in seeders); it is stored as a string field inside the definition JSON.
4. This JSON is **configuration / source**, not end-user form data.
5. Edits go to **`unpub_shape`**. Live consumers should prefer **`pub_shape`** after publish.
6. Default blocks are seeded; custom components must use this same shape.

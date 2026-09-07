# Ciian — Default Components

What ships with the platform as ready-to-place building blocks, where those
definitions live, and the rules a default block has to follow.

Read `.ai/shapes/cmp_format.md` first — it defines the component format. This
document covers only what is different about a **default** block.

---

## Why defaults exist

A page builder with an empty palette cannot build anything. Default blocks are
the starting set every install has, so a new system can be assembled before
anyone writes or uploads a component of their own.

They are deliberately **content-only**. Nothing here binds to a database table:
data-bound blocks need a binding contract that does not exist yet, and shipping
half of one would set it in stone prematurely.

---

## Where they live

| Thing | Path | Tracked |
|-------|------|---------|
| Definition (source of truth) | `.ai/shapes/default/{slug}.yaml` | yes |
| Generated source | `resources/js/components/default/{slug}.tsx` | yes |
| Database row | `ciian_cmp` | — |

Two things follow from that table.

**The YAML is the source of truth, not the TSX.** `CiianComponentSeeder` reads
every `.yaml` in `.ai/shapes/default/`, runs it through the same
`App\Support\ComponentShapeBuilder` an upload goes through, and writes the `tsx`
block out to `resources/js/components/default/{slug}.tsx`. Editing the generated
file directly is pointless — the next seed overwrites it. Change the YAML and
re-seed.

**Default sources are tracked, unlike uploaded ones.** `resources/js/components/custom/`
is gitignored because uploads are per-install; `default/` is not, because these
blocks ship with the platform and every install must have them even before the
seeder runs.

---

## The blocks

| Slug | Name | Category | Properties |
|------|------|----------|------------|
| `heading` | Heading | content | `text`, `level` (h1–h4), `align` |
| `text` | Text | content | `body`, `align`, `muted` |
| `button` | Button | actions | `label`, `variant`, `size`, `href` |

`button` renders an anchor when `href` is set and a plain button when it is not,
so the same block covers a link and an action.

---

## Rules a default block must follow

- **Seeded with `can_delete: false`.** Pages may already place them, and nothing
  in the app flips that column afterwards. `DeleteComponent` refuses them
  outright.
- **Seeded as `published`.** There is no draft of a block that ships with the
  platform — it is usable the moment it is seeded.
- **Held to the upload contract.** The seeder does not take a shortcut around
  `ComponentShapeBuilder`, so a default block cannot drift from what a custom
  block must satisfy. An invalid definition fails the seed loudly rather than
  seeding a broken row.
- **Property keys match the props the source destructures, exactly.** A property
  with no matching prop can never be applied; a prop with no property can never
  be set. `App\Support\TsxProps` reads the destructured names and
  `ComponentShapeBuilder` enforces the match.
- **Each default matches the prop's default in the source.** The two are the same
  fact written twice, and the builder seeds a newly placed block from the
  property map — so a mismatch means a block looks different the moment it is
  placed.

---

## Property types and what the component receives

| Type | Control | Value the component gets |
|------|---------|--------------------------|
| `string` | Text input | `string` |
| `text` | Textarea | `string` |
| `select` | Dropdown | `string`, one of `options` |
| `checkbox` | Checkbox | `boolean` |

A definition writes every default as a string, YAML `false` included. **Checkbox
is the exception at render time:** the builder stores it as a real boolean, so
the component's prop can be typed `boolean` rather than the string `'false'`.
That coercion happens in the builder, which has the definition to consult —
never in `BlockRenderer`, which does not.

Narrow a `select` value rather than casting it, so an unrecognised value falls
back to the default instead of reaching the component. Both `heading` and
`button` do this with a small `switch`.

---

## Adding a default block

1. Write `.ai/shapes/default/{slug}.yaml` in the `cmp_format.md` shape.
2. Run `php artisan db:seed --class=CiianComponentSeeder`.
3. Commit both the YAML and the generated `resources/js/components/default/{slug}.tsx`.
4. Rebuild — `block-registry.ts` globs the folder at build time, so a new file
   only appears in the palette once Vite has picked it up.

---

## Related

- `.ai/shapes/cmp_format.md` — the component definition format.
- `.ai/shapes/cmp_example.yaml` — a worked custom example.
- `.ai/context/overview.md` — where components sit in the platform.

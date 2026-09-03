# Main Content Would Not Scroll Vertically

Page content was cut off at the fold with no scrollbar anywhere — neither on the
document nor on the content region. Reaching anything below the fold was
impossible.

**Scope:** app shell layout (`AppShell`, `AppSidebarLayout`) and the table editor pages.

**Symptom surface:** every page using `AppLayout`; most visible on `tables/create` and `tables/{id}/edit`, whose content is tall.

**Fixed in:** `c019935`, `f410178`.

---

## Symptom

On the New table page the form rendered normally down to roughly the viewport
height and then simply stopped — the Shape (JSON) panel was sliced mid-content.
No scrollbar appeared, the mouse wheel did nothing, and keyboard paging did
nothing. The sidebar and breadcrumb header looked correct.

---

## Root cause

Two independent clipping layers, stacked. Fixing either one alone left the
symptom completely unchanged, which is what made this deceptive.

### Layer 1 — `overflow-x-clip` silently disabled vertical scrolling

`AppSidebarLayout` set `overflow-x-clip` on the main inset to contain horizontal
overflow. Per the CSS Overflow spec, when one axis is `clip` and the other is
`visible`, the `visible` axis is forced to `clip` as well. `overflow-y` was never
declared, so it defaulted to `visible` and was silently promoted to `clip` —
which clips without ever producing a scrollbar.

`hidden` does **not** behave this way: it forces the other axis to `auto`.

```text
overflow-x: clip   + overflow-y: visible  →  overflow-y: clip   ✗ cannot scroll
overflow-x: hidden + overflow-y: visible  →  overflow-y: auto   ✓ scrolls
```

### Layer 2 — the editor pages capped their own height

`table/create.tsx` and `table/update.tsx` both wrapped their content in:

```tsx
<div className="flex h-[calc(100svh-5rem)] flex-col overflow-hidden px-4 py-6">
```

That cap is deliberate. `table-form.tsx` is a three-panel editor whose panels
scroll independently, which requires a bounded parent. But the panels only sit
side by side at the `xl` breakpoint (`xl:grid-cols-[...]`). Below `xl` the grid
collapses to a single column, the three panels stack, and the stack is far taller
than `calc(100svh - 5rem)` — so `overflow-hidden` clipped it with no scrollbar.

The `5rem` was also a hardcoded guess at the chrome height, which drifts whenever
the header changes.

---

## The fix

### 1. Pin the shell, scroll one region

`AppShell` pins the wrapper to the viewport so the sidebar and header stay fixed:

```tsx
<SidebarProvider defaultOpen={isOpen} className="h-svh">
```

`AppSidebarLayout` drops the inset's own `min-h-svh` (so it stretches to the
pinned shell rather than overflowing it) and puts `{children}` in the single
scrolling element:

```tsx
<AppContent variant="sidebar" className="min-h-0 min-w-0 overflow-hidden">
    <AppSidebarHeader … />
    <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        scroll-region=""
    >
        {children}
    </div>
</AppContent>
```

Two attributes here are load-bearing and easy to drop:

| Attribute | Why it is required |
|-----------|--------------------|
| `min-h-0` | A flex child will not shrink below its content height without it. Omit it and the region grows to fit its content instead of scrolling — no scrollbar, same bug. |
| `scroll-region=""` | Inertia v3 resets scroll position between visits by finding elements marked this way. Since the document no longer scrolls, omitting it means scroll position never resets on navigation. See [Inertia scroll management](https://inertiajs.com/docs/v3/advanced/scroll-management). |

### 2. Scope the editor's height cap to the breakpoint that justifies it

Both table editor pages now use:

```tsx
<div className="flex flex-col px-4 py-6 xl:h-full xl:overflow-hidden">
```

- **Below `xl`** — no cap. The panels stack and the layout's scroll region
  scrolls the page as a whole.
- **At `xl`** — `h-full` fills the layout's scroll region exactly, preserving
  independent panel scrolling, with no hardcoded chrome offset.

---

## Files changed

| File | Change |
|------|--------|
| `resources/js/components/app-shell.tsx` | `h-svh` on `SidebarProvider` to pin the shell. |
| `resources/js/layouts/app/app-sidebar-layout.tsx` | `min-h-0 overflow-hidden` on the inset; new `overflow-y-auto` + `scroll-region` child. |
| `resources/js/pages/table/create.tsx` | Height cap scoped to `xl`, `h-full` replaces `calc(100svh-5rem)`. |
| `resources/js/pages/table/update.tsx` | Same as create. |
| `.ai/rules/design.md` | Recorded the architecture and both traps under "Layout & structure". |

---

## Verification

1. Open `tables/create` in a window **narrower than 1280px** (`xl`). The whole
   page scrolls; the sidebar and breadcrumb header stay fixed.
2. Widen past 1280px. The three panels sit side by side, each scrolling
   independently, and the page as a whole does not scroll.
3. Navigate away and back. Scroll position resets to the top — this is what
   proves `scroll-region` is wired correctly.

---

## Avoiding a repeat

- Pages add **no** height cap and **no** `overflow-y` of their own; the layout
  owns scrolling. The panel editor is the one exception, and its cap is scoped to
  `xl`.
- Never use `overflow-x-clip` to contain horizontal overflow. Use
  `overflow-x-hidden`.
- Never use `h-[calc(100svh-…)]` to subtract chrome height. Use `h-full` inside
  the layout's scroll region.
- Keep exactly one `scroll-region`. Nesting more makes scroll position ambiguous.
- When content is cut off, check **both** the layout and the page component
  before concluding either is at fault. Both can clip, and fixing one alone
  leaves the symptom identical.

These are enforced as conventions in `.ai/rules/design.md` under
"Layout & structure".

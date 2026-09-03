# A Failed Sync Left the Table Half-Migrated

A sync that failed partway left the physical table stranded between its published
and draft shapes, while `pub_shape` still described the old one. The stored shape
and the real table disagreed, and nothing told the user.

**Scope:** `PublishTable`, `ApplyTableSchema`.

**Related:** `.ai/fixes/` sibling entries; the pre-flight guard in `TableChangeInspector`.

---

## Symptom

Publishing a change to an already-published table could fail midway. The error
surfaced correctly, but the table was left with some of the change applied — a
column already dropped, say, while a later step never ran.

`pub_shape` was only written on success, so it still described the pre-sync
table. From that point on the two disagreed, and the next sync diffed against a
baseline that no longer existed — compounding the drift instead of correcting it.

---

## Root cause

MySQL/MariaDB do not support transactional DDL: each `ALTER TABLE` commits
implicitly, so a failure halfway through a multi-statement sync cannot be rolled
back by the database. `ApplyTableSchema::sync()` issues its work as several
statements in sequence:

1. drop foreign keys on dropped/rebuilt columns
2. drop columns leaving the shape
3. add new columns
4. change (rename / rebuild) columns that stay
5. add or drop timestamps

A failure at any step leaves every earlier step applied.

`PublishTable` already rolled back a failed **create** by dropping the new table,
but had no equivalent for a failed **sync**.

---

## The fix

### Restore the table on failure

`ApplyTableSchema::revert($from, $to)` returns the table to `$from` — the
published shape that `pub_shape` still describes.

Reverting needs to know what is *actually* in the database, and reading column
definitions back out of the driver is both driver-specific and a poor fit for
Ciian's own type names. It is avoided entirely: a column can only be in one of
two forms, its `$from` form or its `$to` form, and both are already in hand. So
`liveShape()` asks the database which of the two names is present and takes that
form, then hands the reconstruction to the existing `sync()` to bring it back:

```php
$this->sync($this->liveShape($from, $to), $from);
```

The `$to` form is tried first — wherever the sync managed to rename or rebuild a
column, that is the form now live; where it did neither, both forms carry the
same name and describe the column equally well.

Reusing `sync()` means indexes, foreign keys and timestamps are all reverted by
the same code paths that applied them, with no second implementation to drift.

### Say what state the table was left in

`PublishTable::failureMessage()` now distinguishes three outcomes, because the
user's next move differs entirely between them:

| Outcome | Message |
|---------|---------|
| Publish (create) failed | `Publishing failed: …` — the new table was dropped. |
| Sync failed, restore worked | `Sync failed, so the table was left on its published shape. …` |
| Sync failed, restore also failed | Both errors, plus a warning that the table may be partly changed. |

The draft in `unpub_shape` is never touched, so the user can correct it and sync
again. The message reaches the UI through the existing `errors.shape` channel,
which toasts short messages and offers long driver errors in a modal.

---

## Known limitation

Data in a column the failed sync already **dropped** does not come back — the
column is restored empty. Recovering it would require copying the whole table
before every sync, which is not worth the cost. This matches the project's
existing stance that an ALTER may discard data.

---

## Files changed

| File | Change |
|------|--------|
| `app/Support/ApplyTableSchema.php` | New `revert()` and `liveShape()`. |
| `app/Actions/Database/PublishTable.php` | Calls `revert()` when a sync throws; new `failureMessage()`. |

---

## Verification

Reproduced against the live MariaDB database with a scratch table, forcing a sync
that succeeds partway and then fails:

1. Publish a table with columns `id, alpha, beta`.
2. Add a `ghost` column directly in SQL, so Ciian does not know about it.
3. Draft a change that drops `beta` **and** adds `ghost`. Step 2 of the sync
   succeeds (`beta` dropped); step 3 fails (`Duplicate column name 'ghost'`).

Result:

```text
message: Sync failed, so the table was left on its published shape.
         SQLSTATE[42S21]: Duplicate column name 'ghost'
columns after failure: alpha, beta, created_at, id, updated_at
  beta restored: YES
  pub_shape columns missing from table: none (consistent)
  status still published: yes
```

A separate regression check confirmed an ordinary sync (add a column, rename
another) still applies cleanly and leaves no pending changes.

The "restore also failed" branch is deliberate defence in depth and has not been
exercised against a real failure.

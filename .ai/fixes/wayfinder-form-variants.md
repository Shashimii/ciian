# Regenerating Wayfinder Types Broke Every `.form` Call

Running `php artisan wayfinder:generate` with no flags removed the `.form`
variants from every generated route, turning one TypeScript error into ten.

**Scope:** Wayfinder generated output (`resources/js/actions`, `resources/js/routes` — both gitignored).

---

## Symptom

`npx tsc --noEmit` reported one pre-existing error. After regenerating, it
reported ten, all of this form:

```text
Property 'form' does not exist on type '{ (options?: RouteQueryOptions): RouteDefinition<"post">; … }'
```

Affected `login`, `register`, `reset-password`, `verify-email`, `profile`,
`security`, `confirm-password`, `forgot-password` and `delete-user`.

---

## Root cause

`vite.config.ts` configures the Wayfinder plugin with form variants enabled:

```ts
wayfinder({
    formVariants: true,
})
```

The Artisan command does **not** read that config. Its equivalent is the
`--with-form` flag, which defaults off. Running the bare command therefore
regenerates the same files without `.form`, silently dropping API the app
already uses.

---

## The fix

Always pass the flag so the CLI matches the Vite plugin:

```bash
php artisan wayfinder:generate --with-form
```

This restored the ten broken files immediately. The generated directories are
gitignored, so the breakage never reaches a commit — but it does break local
typechecking and the dev build until regenerated correctly.

---

## Still outstanding

One pre-existing error remains and is unrelated to the flag:

```text
resources/js/components/manage-passkeys.tsx(3,25): error TS2307:
Cannot find module '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController'
```

The controller exists, but in `vendor/laravel/passkeys/src/Http/Controllers/`,
and Wayfinder only scans the application by default. `manage-passkeys.tsx` is not
imported anywhere — passkeys are deliberately hidden (see the Notables section of
`.ai/context/flow.md`), so this is dead code referencing an ungenerated module.

Closing it means either pointing Wayfinder at the vendor path (its `--path` /
`path` option takes a single path, so this needs care not to replace the default
application scan) or removing the unused component. Neither was done here.

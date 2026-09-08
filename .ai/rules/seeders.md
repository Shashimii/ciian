---
paths:
  - 'database/seeders/**'
---

# Seeders

## Seeders are the only definition of shipped data
Ciian's shipped roles and permissions are defined once, in `SystemDefaultsSeeder::defaultRoles()` and `defaultPermissions()`. Nothing else in the application creates a role or a permission — app code resolves one and fails if it is absent.

`CreateNewUser` and `UserFactory` therefore use `Role::query()->where('slug', Role::USER)->valueOrFail('id')`, the same idiom `RootAccountSeeder` uses for Root. Do not reintroduce a `firstOrCreate` fallback in either. Minting a role against an unseeded database produces a half-initialised platform — a User role with no permissions table behind it and no Root account — that looks healthy while being broken. An unseeded database is a broken install and should fail loudly.

The seeder uses `updateOrCreate` keyed on slug, so it also enforces the values: editing a shipped role's name, description or icon and re-seeding overwrites those columns in any existing database. That is intended for locked roles.

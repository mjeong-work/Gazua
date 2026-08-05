# Deploy Checklist

## Migrations go out before the code that depends on them

**What happened (2026-08-05):** a commit added `credibility_level` to
`AdminUserDetailPage`'s query columns (`USER_DETAIL_COLUMNS` in
`adminUsers.service.ts`) in the same change as the migration that creates
that column (`supabase/migrations/20260805000000_credibility_level.sql`).
The migration was written but not yet applied to the live database when the
app code shipped to the dev environment, so every admin user detail fetch
failed with a Postgres "column does not exist" error — `AdminUserDetailPage`
rendered its error state for every user, in every environment still on the
old schema, until someone manually ran `supabase db push`.

**The rule:** a migration must be applied to every environment (dev, staging,
prod) *before* the app code that reads/writes the column, table, function, or
RPC it introduces gets deployed there. Never ship both in the same release
step and assume they land atomically — they don't. This app's migrations are
checked into `supabase/migrations/` but are **not** auto-applied by CI/CD;
someone has to run `supabase db push` (or apply via the Supabase Dashboard
SQL Editor) as an explicit, separate step.

**Before merging a PR that adds a migration:**

1. Apply the migration to every environment the PR's code will run against
   *before* merging (or at minimum before that environment's deploy), via
   `supabase db push` or the Dashboard SQL Editor.
2. Only after that, deploy/merge the app code that depends on the new
   schema.
3. If a migration adds a `NOT NULL` column or a `CHECK` constraint on an
   existing table, run a read-only pre-flight query for violating rows
   first (see the comment at the top of
   `20260805010000_portfolio_allocation_validation.sql` for an example) —
   `ALTER TABLE ... ADD CONSTRAINT` validates every existing row and will
   fail outright if any of them violate it.
4. Never assume a migration file existing in the repo means it's live
   anywhere. Check with `supabase migration list` (compares local files
   against what the linked project has actually applied) before relying on
   a column/function/RPC being present.

**Rolling back:** if app code referencing a new column/RPC ships before the
migration lands, the fastest fix is applying the migration (not reverting
the code) — reverting still leaves the environment on stale-but-working
schema and you'll hit the same race the next time someone deploys the
already-merged code. Prefer forward-fixing via `supabase db push`.

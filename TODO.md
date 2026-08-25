# TODO

## Pre-existing `tsc --noEmit` errors (partially fixed — remaining tracked here)

This project had no `tsconfig.json` before the branch that added it (see the
commit adding `tsconfig.json` + `src/vite-env.d.ts`), so `tsc --noEmit` had
never been run against this codebase. Running it then surfaced 45 pre-existing
errors; that grew to 57 as later branches (`simulations`, `feedback`) hit the
same underlying bug on their new tables.

Re-run to reproduce: `npm exec --yes --package typescript -- tsc --noEmit -p .`

### A. Supabase `.insert()/.update()/.rpc()` generic inference problem — FIXED (was 51 errors)

Root cause: every table entry in `src/types/database.ts` was missing a
`Relationships: []` field. `@supabase/postgrest-js`'s `GenericTable` type
requires `Row`/`Insert`/`Update`/`Relationships` all present — without it,
`Database['public']` structurally fails to extend `GenericSchema`, so
`SupabaseClient`'s `Schema` generic collapses to `never` for the *entire*
client, not just the table missing the field. That's why write payloads,
joined-select reads, and `.rpc()` args were all typing as `never`/`undefined`
project-wide: one missing field, cascading everywhere.

Fix applied: added `Relationships: []` to all 23 tables, and filled in the
`Functions` map (was `Record<string, never>`) with real `Args`/`Returns`
signatures for the 5 RPCs actually called from the client
(`admin_set_user_status`, `admin_set_content_moderation_status`,
`admin_set_credibility_level`, `increment_post_shares`,
`increment_model_downloads`). Also added the `reel_comments` table, which
existed in the DB schema (`20260713000000_reel_comments.sql`) but was never
added to `database.ts` at all — a separate, genuine gap the `never`-masking
had been hiding.

This also surfaced two real (pre-existing, previously-masked) bugs, now fixed:
- `profiles.service.ts`'s `getCreatorByUsername`/`getCreators`/`searchCreators`
  declared their return type as the full `Profile` row but only ever
  `.select()`ed a column subset (`CREATOR_LIST_COLUMNS`) — every caller was
  already only reading fields within that subset, so this was latent, not a
  live bug. Introduced `CreatorListProfile` (a `Pick<Profile, ...>` matching
  the column list) as the accurate return type and updated the 6 call sites
  (`CreatorsPage`, `SearchModal`, `useCreatorProfileData`,
  `CreatorProfileHeader`, `CreatorAboutTab`) accordingly.
- `models.service.ts`'s `getModels(options)` typed `category`/`accessLevel`
  as loose `string` instead of `ModelCategory`/`ModelAccessLevel`.

`Relationships` is `[]` (not populated with real FK metadata) for every
table — this unblocks generic inference for writes/RPCs but embedded-resource
selects (`.select('*, creator:profiles(...)')`) still don't get fully precise
per-relationship typing (they fall back to a looser embed type). Populating
real `Relationships` arrays per FK is a possible follow-up if joined-select
typing needs to get stricter, but is not required for the errors this
category was tracking.

### B. `@types/react-dom` missing devDependency — 3 errors (not fixed)

`@types/react` (v19.2.14) is installed but `@types/react-dom` isn't — every
`react-dom`/`react-dom/client` import implicitly types as `any`. Also worth
checking whether pinning `@types/react` to a v18-line version (matching the
actual `react`/`react-dom` runtime, 18.3.1) is more correct than the
currently-installed v19 types before adding `@types/react-dom` — installing
a mismatched-major-version `@types/react-dom` alongside a v19 `@types/react`
and v18 runtime could either fix or compound the existing type/runtime
version mismatch.

- `src/main.tsx`
- `src/app/components/reels/ReelEngagementActions.tsx`
- `src/app/components/reels/ReelEngagementBar.tsx`

### C. `WatchlistItem` type mismatch: app-level shape vs. DB row shape — 2 errors (not fixed)

Two different things are both called `WatchlistItem` — the DB row shape
(snake_case, e.g. `asset_type`) and an app-level display shape (camelCase,
e.g. `assetType`, plus derived fields like `price`/`change1D`/`change1W`
that don't exist on the DB row at all). `userActivity.ts` also has a plain
`asset_type` → `assetType` typo/naming mismatch on top of the shape gap.

- `src/app/components/InvestmentProfilePage.tsx`
- `src/app/data/userActivity.ts`

# TODO

## Pre-existing `tsc --noEmit` errors (not fixed — tracked here)

This project had no `tsconfig.json` before this branch (see the commit
adding `tsconfig.json` + `src/vite-env.d.ts`), so `tsc --noEmit` had never
been run against this codebase. Running it now surfaces 44 pre-existing
errors, none of which are regressions from this branch's work — 2 real
regressions it did surface (`MockCreator` missing `credibilityLevel`) were
already fixed separately. The 44 below are intentionally **not fixed** here;
categorized so a future session can pick a category and knock it out.

Re-run to reproduce: `npm exec --yes --package typescript -- tsc --noEmit -p .`

### A. Supabase `.insert()/.update()/.rpc()` generic inference problem — 38 errors

The Supabase JS client isn't resolving its generics against this project's
hand-written `Database` type (`src/types/database.ts`) the way it should —
write payloads and some joined-select read results type-check as `never` /
`never[]`, and every `.rpc()` call's argument type-checks as `undefined`
(traces back to `Functions: Record<string, never>` in `database.ts` — the
Functions map was never fleshed out with real RPC signatures). Needs its
own investigation — likely either a `@supabase/supabase-js` version
mismatch against how the Database type is shaped, or missing pieces
(`Relationships`, etc.) that newer supabase-js versions expect for
inference.

- **A1. `.rpc()` args → `undefined` parameter — 5 of the 38**
  - `src/lib/services/adminUsers.service.ts` (2 occurrences)
  - `src/lib/services/adminContent.service.ts`
  - `src/lib/services/models.service.ts`
  - `src/lib/services/posts.service.ts`
- **A2. `.insert()/.update()` payload, or a joined-select read result, typed as `never`/`never[]` — 33 of the 38**
  - `src/lib/services/follows.service.ts` (5 occurrences)
  - `src/lib/services/watchlist.service.ts` (4 occurrences)
  - `src/lib/services/reels.service.ts` (4 occurrences)
  - `src/lib/services/posts.service.ts` (3 more, distinct from A1)
  - `src/lib/services/profiles.service.ts`, `notifications.service.ts`, `messages.service.ts`, `comments.service.ts`, `reelComments.service.ts`, `savedContent.service.ts`
  - `src/app/data/userActivity.ts` (5 occurrences — mock/seed data file, not a service)
  - `src/app/components/onboarding/SignUp.tsx`

### B. `@types/react-dom` missing devDependency — 3 errors

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

### C. `WatchlistItem` type mismatch: app-level shape vs. DB row shape — 3 errors

Two different things are both called `WatchlistItem` — the DB row shape
(snake_case, e.g. `asset_type`) and an app-level display shape (camelCase,
e.g. `assetType`, plus derived fields like `price`/`change1D`/`change1W`
that don't exist on the DB row at all). `userActivity.ts` also has a plain
`asset_type` → `assetType` typo/naming mismatch on top of the shape gap.

- `src/app/components/InvestmentProfilePage.tsx`
- `src/app/data/userActivity.ts`

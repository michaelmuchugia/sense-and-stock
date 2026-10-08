AfriQuant — Phase 3: API Layer & Data Resolution Super Prompt

MISSION
Move every server component off the `lib/data/*` mock arrays and onto a unified resolver layer (`lib/api/*`) that reads from the Neon database when populated and falls back to the prototype arrays per-stock when the database lacks data. The site visually keeps working today — the 6 stocks with real prices and the 3 stocks with real targets immediately show live data; the other 59 keep using the prototype values with a small `prototype` indicator so the user (and the operator) know what is live versus what is awaiting backfill.

By the end of Phase 3:
- Components import data through `lib/api/*` instead of `lib/data/*`
- Score-driven UI reads precomputed scores from `stock_scores` (already populated for all 65 stocks via Phase 2's recompute)
- Engine "wrapper" functions (`getSignalOfTheWeek`, `getHiddenOpportunities`, `getTopOpportunities`) no longer iterate the mock arrays — they iterate DB-backed data with mock fallback
- A per-row provenance pill makes the live-vs-prototype split explicit in tables and cards
- The ingest pipeline gets an optional revalidate hook so freshly-ingested data shows up immediately instead of waiting up to an hour for ISR

This phase does not touch the score formula. It does not touch the ingest pipelines. It does not introduce authentication. It does not change the visual design beyond adding the prototype indicator.

LOCKED DECISIONS (from collaboration prior to writing this plan)

1. **Hybrid resolver, not strict swap.** DB-first; mock-fallback per stock for fields that are missing in DB. This keeps the UI healthy from day one and turns Phase 3 into a quiet architecture migration rather than a visible regression.

2. **Field-level fallback granularity.** A stock's static fields (ticker, name, sector, profile) always come from DB (Phase 1 seeded all 65). The dynamic fields (current price, day change, 52w window, volume) come from `stock_prices` if a row exists, otherwise from the prototype `STOCKS` array. Analyst metadata always comes from DB. Scores always come from `stock_scores` (Phase 2 recompute populates this for all stocks). Signal snapshots always come from DB (Phase 1 seeded six months).

3. **Per-row `prototype` indicator.** A small text pill (label `prototype`, same muted-tone styling as the existing demo banner) appears on rows whose price data fell back to mock. No emojis. Vanishes automatically as the operator backfills.

4. **Engine wrappers move with the resolver.** `lib/engine/signals.ts` currently iterates `STOCKS` and `ANALYSTS`. It will be rewritten to call `lib/api/*` so the same logic runs against live data when present.

5. **lib/data/* stays.** It becomes the fallback source. We do not delete it. When the DB is fully populated and we have weeks of confidence, a future cleanup can remove it — but not in Phase 3.

6. **No new auth.** Phase 4 brings authentication. Phase 3 does not change the watchlist or any user-scoped behaviour.

7. **Cache freshness via on-demand revalidation.** Ingest CLIs and the admin endpoint optionally hit a new `/api/admin/revalidate` endpoint (protected by ADMIN_SECRET, mirroring `/api/admin/recompute-scores`) so freshly-ingested data shows up immediately. Without it, the existing ISR caches still apply — users see fresh data within ~1 hour. Revalidation is opt-in (a flag on the CLI) so we don't accidentally flood the cache during a backfill marathon.

SECURITY POSTURE — READ BEFORE WRITING ANY CODE
Phase 3 has a smaller new attack surface than phases 1 or 2 — most work is moving server-side reads from one source to another. The deltas are:

New attack surfaces
- `/api/admin/revalidate` admin endpoint — same shape as `/api/admin/recompute-scores`: ADMIN_SECRET Bearer, timing-safe compare, per-IP rate limit, runtime pin, sanitized errors. Reuses `lib/api/auth.ts` helpers.
- The resolver layer (`lib/api/*`) — server-only modules that wrap DB queries. Identical risk profile to `lib/db/queries/*`.

Things that must remain true
- No new public read endpoints. All data continues to flow through Next.js server components / SSG output. No `GET /api/stocks` exposed to clients.
- Resolver functions are server-only. Verified via project-local `server-only` import (the same shim Phase 2 set up).
- The prototype-fallback path reads from compiled-in arrays — no filesystem reads, no network — so it cannot introduce SSRF or path-traversal.
- The provenance pill is a presentational signal only. It must not be coupled to security decisions (e.g., it does not grant elevated trust to mock vs DB rows).
- Components that today read directly from `lib/data/*` keep working until migrated. The migration is route-by-route, allowing each PR to be small and bisectable.

Per-row resolver discipline
- Every resolver returns a typed value plus a `_provenance` field marking which source filled the dynamic columns. The UI uses this for the pill; tests use it to assert which path executed.
- The `_provenance` field is stripped by an explicit JSON.stringify before any value crosses the server-to-client boundary in props that should not leak architectural detail — or, equivalently, the field is named with a leading underscore and excluded by serializer tests. **(Decision deferred until we hit the first client-side use case.)**

What must never happen
- No client component imports from `lib/data/*` or `lib/api/*` directly. Resolvers are server-only.
- No raw SQL string concatenation in any new resolver query.
- No silently failing fallback — every fallback emits a `console.debug` in development with the missing ticker so the operator's terminal becomes a passive backlog reminder during dev work.
- No revalidation triggered as a side effect of a read path. Only the admin endpoint or the CLI flag may call revalidate.

PROJECT STRUCTURE ADDITIONS
Add only these files. Do not modify any existing file outside the explicit edit list below.

afriquant/
├── lib/
│   └── api/
│       ├── stocks.ts          ← getAllStocks, getStockByTicker, getStocksWithPrices
│       ├── analysts.ts        ← getAllAnalysts, getAnalystByExternalId, getAnalystsForStock
│       ├── snapshots.ts       ← getAllSnapshots, getSnapshotByMonth
│       ├── scores.ts          ← getScoresMap, getScoreByTicker
│       ├── moves.ts           ← getDailyMoves (currently mock-only; placeholder for future ingest)
│       ├── meta.ts            ← Provenance enums + helpers
│       └── revalidate.ts      ← revalidateAll, revalidateTickers (calls Next's revalidateTag)
├── components/ui/
│   └── ProvenanceBadge.tsx    ← Small "prototype" pill, used in tables and cards
└── app/api/admin/
    └── revalidate/
        └── route.ts           ← POST endpoint, ADMIN_SECRET, accepts { tags?, paths? }

EDITS TO EXISTING FILES (the only edits permitted)

1. Engine wrappers (these currently iterate lib/data/*; rewrite to use lib/api/*):
   - `lib/engine/signals.ts`
   - `lib/engine/score.ts` (used by tests / fallback path; keep but mark as fallback-only)
   - `lib/engine/risk.ts` (currently pure; no change needed but verify)

2. Server components reading from lib/data/* — replace imports route-by-route:
   - `app/page.tsx`
   - `app/stocks/page.tsx`
   - `app/stocks/[ticker]/page.tsx`
   - `app/analysts/page.tsx`
   - `app/analysts/[id]/page.tsx`
   - `app/leaderboard/page.tsx`
   - `app/sectors/page.tsx`
   - `app/perspectives/page.tsx` (perspectives content is static — no change needed)
   - `app/dashboard/page.tsx`
   - `app/smartscreen/page.tsx`
   - `app/signals/page.tsx`
   - `app/compare/page.tsx`

3. Server-rendered home + signals components:
   - `components/home/SignalOfTheWeek.tsx`
   - `components/home/HiddenGems.tsx`
   - `components/home/TopOpportunities.tsx`
   - `components/home/HeroLeaderboard.tsx`
   - `components/home/StatStrip.tsx` (counts may need updating from DB)

4. Score-displaying components — switch from inline `calcScore()` to reading `stock_scores`:
   - `components/stocks/StockCard.tsx`
   - `components/stocks/StockDetailHeader.tsx`
   - `components/stocks/SimpleView.tsx`
   - `components/stocks/DeepView.tsx`

5. Scripts that may want to trigger revalidation:
   - `scripts/ingest-prices.ts` — add optional `--revalidate` flag
   - `scripts/ingest-research.ts` — same
   - `scripts/recompute-scores.ts` — same

6. `package.json`
   - No new scripts needed (the CLI flag handles revalidate). Maybe add `npm run revalidate` as a manual operator tool.

THE RESOLVER CONTRACT
Every resolver function returns the exact same TypeScript shape as the corresponding mock data array, plus an optional `_provenance` field. Drop-in replacement.

  // lib/api/stocks.ts (shape sketch — actual code below)
  export interface ResolvedStock extends Stock {
    _provenance: 'db' | 'mock' | 'hybrid'
  }
  export async function getAllStocks(): Promise<ResolvedStock[]>
  export async function getStockByTicker(ticker: string): Promise<ResolvedStock | null>

Resolution rules:
- The base stock metadata (ticker, name, sector, profile, a-count, hit ratio aggregation, buy/hold/sell percentages, avgPT) comes from joining `stocks` + `analyst_coverage` + current `analyst_targets`. When the DB has no current targets for a stock, the resolver fills those fields from the mock STOCKS entry for that ticker.
- The price-dependent fields (`p`, `c`, `h52`, `l52`, `vol`) come from the most recent `stock_prices` row. When no row exists, those fields come from the mock STOCKS entry.
- `_provenance` is `'db'` when every dynamic field is DB-sourced, `'mock'` when every dynamic field is mock-sourced, `'hybrid'` when split.
- Mock fallback for an unknown ticker (i.e. a ticker that exists in DB but not in the prototype STOCKS array) returns sensible zeroes and `_provenance: 'db'` with a warning logged.

For analysts: the prototype's 16 entries are all in DB. Resolver returns DB rows directly; `_provenance: 'db'` always (the field exists for symmetry).

For scores: read from `stock_scores`. Phase 2 ensures every active stock has a row. If a row is missing (shouldn't happen — but defensive), the resolver computes via `calcScoreFromInputs` from the ResolvedStock and logs a warning.

For signal snapshots: DB-sourced; Phase 1 seeded six months.

For daily moves: currently mock-only (no DB table yet). Phase 3 surfaces this via the resolver but doesn't change it. A future phase will add an `analyst_moves` table and a delta-detection pipeline.

PER-ROW PROVENANCE PILL
A `<ProvenanceBadge provenance={p} />` component renders a small muted pill:
- `provenance === 'db'`: renders nothing
- `provenance === 'mock'`: renders a pill with text `prototype` in `var(--txdd)` background, same font/sizing as existing badges
- `provenance === 'hybrid'`: renders a pill with text `partial` (some live data, some prototype)

The badge appears:
- In the stocks list grid (right-aligned under the ticker)
- On the stock detail header (next to the price)
- On the Smart Screen table (a new narrow column)
- On Top Opportunities and Hidden Gems cards (top-right corner)

It does not appear:
- On analyst rows (analyst data is always DB)
- On signal snapshots (always DB)
- On leaderboard (analyst data only)

CACHE INVALIDATION STRATEGY
ISR currently revalidates `/`, `/stocks/[ticker]`, `/analysts/[id]`, `/leaderboard` every 3600 seconds. Users see fresh data within an hour. Good baseline.

For operator workflow when they want instant freshness (e.g., after an end-of-day price ingest):

1. Each CLI ingest accepts an optional `--revalidate` flag that, on success, calls the new admin endpoint to flush relevant tags.
2. The admin endpoint accepts `{ tags?: string[], paths?: string[] }` — both arrays optional. Defaults to revalidating everything if both empty (rare, used for big backfills).
3. Tag scheme:
   - `stocks` — all stocks data
   - `stock:<ticker>` — a specific stock detail page
   - `analysts` — all analysts data
   - `analyst:<id>` — a specific analyst detail page
   - `scores` — all stock scores (used by home page, smart screen)
   - `snapshots` — signal snapshots (used by /signals)
4. Resolvers tag their `unstable_cache` wrappers with these tag names.

If a CLI runs without `--revalidate`, ISR's 1-hour window still applies. This makes the default safe for backfills (no cache stampede) and lets the daily-price-ingest cron flush explicitly.

MIGRATION ORDER — FOLLOW THIS ORDER (least risky first)
Do not skip steps. Each step is independently shippable.

Step 1 — Build resolver layer (no UI changes)
- Write `lib/api/stocks.ts`, `analysts.ts`, `scores.ts`, `snapshots.ts`, `moves.ts`, `meta.ts`.
- Write `components/ui/ProvenanceBadge.tsx`.
- Write `lib/api/revalidate.ts` (calls Next's `revalidateTag`).
- Write `app/api/admin/revalidate/route.ts`.
- No component edits yet.
- `npm run build` must pass. Frontend untouched.

Step 2 — Migrate static-ish pages first (low blast radius)
In this order, swap imports from `lib/data/*` to `lib/api/*`:
- `/sectors` — uses STOCKS + ANALYSTS for aggregation
- `/leaderboard` — pure analyst data
- `/analysts` and `/analysts/[id]` — pure analyst data

After each, `npm run build` + open the page locally and confirm it renders.

Step 3 — Migrate stock pages
- `/stocks` — list of all stocks; add ProvenanceBadge per card
- `/stocks/[ticker]` — detail; add ProvenanceBadge in header

Step 4 — Migrate engine wrappers + home
- Rewrite `lib/engine/signals.ts` to call `lib/api/*` instead of iterating arrays.
- Update `app/page.tsx` and the home components.

Step 5 — Migrate Smart Screen and dashboards
- `/smartscreen` — most complex; pass DB-resolved data into the existing client component.
- `/dashboard`, `/signals`, `/compare` — pass resolved data via server-component shells.

Step 6 — Wire CLI revalidation
- Add `--revalidate` flag to each ingest CLI and to recompute-scores.
- Have the flag call `/api/admin/revalidate` with appropriate tags.

Step 7 — Cleanup
- Audit: `grep -r "@/lib/data" components/ app/` should return zero matches (except inside `lib/api/*` itself, which IS the fallback consumer).
- Confirm the project-local `server-only` shim still guards new resolver files.
- Confirm no client component imports anything from `lib/api/*`.

SUCCESS CRITERIA FOR PHASE 3
Phase 3 is complete when every one of these is true:

1. `lib/api/{stocks,analysts,snapshots,scores,moves,meta,revalidate}.ts` exist and are server-only.
2. No file under `app/` or `components/` imports from `@/lib/data/*` (the prototype arrays). The only consumer of `lib/data/*` is `lib/api/*` itself for the fallback path.
3. The home page, all stock pages, all analyst pages, leaderboard, sectors, smartscreen, dashboard, signals, and compare all render correctly with mixed DB + mock data.
4. A stock with a current `stock_prices` row in DB shows real prices and no prototype pill. A stock without one shows prototype prices and the pill.
5. The 3 stocks with current `analyst_targets` (SCOM, KCB, EQTY from Phase 2 testing) show their real targets on the detail page; other stocks show prototype targets with the pill.
6. `stock_scores` is the source of truth for every score shown in the UI. `calcScore` is never called in a server component request path (only in the ingest pipeline or as a last-resort fallback).
7. `POST /api/admin/revalidate` returns 401 without ADMIN_SECRET, 200 with it. The body accepts `{ tags?: string[], paths?: string[] }`.
8. Each CLI ingest script accepts `--revalidate` and, when passed, flushes the relevant tags after a successful run.
9. `npm run build` passes. Bundle size is unchanged (mock fallback shouldn't ship to client).
10. The project-local `server-only` shim still works — `npm run ingest:prices` etc. continue to run in tsx.
11. The visual smoke test: opening `/` shows Top Opportunities including some `prototype` pills and at least one without (the 6 stocks with real prices). Opening `/stocks/SCOM` shows a Strong Match signal driven by real research, no prototype pill. Opening `/stocks/EVRD` (a stock with no DB price or target) shows the prototype pill.

OPEN QUESTIONS (resolved during execution)
- Q1: Do we want the `_provenance` field to ride along on serialized props to client components, or is it server-side only? Answered during Smart Screen migration in Step 5. Default: server-side only, the badge is rendered server-side and emitted as plain HTML.
- Q2: Should `getStocksWithPrices()` join in `stock_scores` for efficiency, or are the two reads separate? Decided by measurement: if home page exceeds 100ms server time we join; otherwise we keep them separate for clarity.
- Q3: When DB has more current targets than the mock has analysts covering a stock, does the average target price come purely from DB or hybrid? Per locked decision 2: purely from DB once any current target exists. The mock's `avgPT` is only used when zero current targets exist in DB.
- Q4: Should the prototype pill be a feature flag (hideable per-deployment for production credibility)? Deferred to Phase 4 along with auth — admins might want it on, end users might want it off.

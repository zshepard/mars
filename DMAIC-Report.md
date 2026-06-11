# MARS App — DMAIC Lean Six Sigma Refactor Report

**Project:** MARS Web App (mars-lyart-alpha.vercel.app)  
**Commit:** `4bddb3b` → pushed to `main`, Vercel auto-deploy triggered  
**Date:** June 10, 2026  
**Methodology:** DMAIC (Define → Measure → Analyze → Improve → Control)

---

## Phase 1 — Define

**Goal:** Eliminate waste, duplicate code, and defects across the MARS React codebase to reduce bundle size, improve maintainability, and prevent runtime crashes.

**Scope:** All files under `src/` — pages, hooks, components, styles, and the service worker registration layer.

---

## Phase 2 — Measure

The following defects were quantified before any changes were made:

| Category | Count | Files Affected |
|---|---|---|
| Duplicate function implementations | 5 functions × 3 locations | Alarms.jsx, Dashboard.jsx, useAlarmTimer.js, Sidebar.jsx, BottomNav.jsx |
| `console.log` in production code | 7 statements | useAlarms.js, index.js, serviceWorkerRegistration.js |
| `console.warn/error` (intentional) | 26 statements | Retained — real error conditions |
| No ErrorBoundary anywhere | 1 | App.jsx |
| Dead CSS classes | 3 | Dashboard.css |
| Redundant `box-sizing: border-box` | 10 declarations | 7 CSS files |
| Redundant `overflow-x: hidden` | 2 declarations | Alarms.css, Dashboard.css |
| Broken import path | 1 | Onboarding.jsx (`../firebase` → `../firebase/config`) |
| Unused state variables | 3 | Dashboard.jsx (`handleSync`, `syncStatus`, `syncMsg`) |
| No loading skeleton on My Day | 1 | Dashboard.jsx |

**Bundle size before:** 321.07 KB gzip JS, 11.25 KB CSS

---

## Phase 3 — Analyze

### Root Cause: Duplicate Time Utilities

Five separate implementations of the same time-calculation logic existed across the codebase. Each was written independently with slight behavioral differences (e.g., `formatCountdown` returned `"45s"` in Alarms.jsx but `"in 45m"` in Dashboard.jsx). This caused inconsistent countdown display across the app and made bug fixes require changes in multiple places.

**Root cause:** No shared utility module existed; each developer (or session) re-implemented the helper locally.

### Root Cause: console.log in Production

Seven `console.log` calls were left from development debugging. These leak internal state information in production browser consoles and add minor bundle weight.

### Root Cause: No Error Boundary

React render errors caused a completely blank white screen with no user feedback. There was no recovery path — users had to manually reload the page.

### Root Cause: Dead CSS

Three CSS modifier classes (`.qa-sync-msg--ok`, `.qa-sync-msg--error`, `.qa-sync-msg--syncing`) were defined but never referenced in any JSX file. These were left over from a previous sync-status UI that was removed.

### Root Cause: Redundant CSS Declarations

`box-sizing: border-box` was declared in 10 individual CSS selectors across 7 files, despite `global.css` already applying it universally via `*, *::before, *::after { box-sizing: border-box; }`. Similarly, `overflow-x: hidden` was set on individual page containers when it was already set on `body`.

---

## Phase 4 — Improve

### Fix 1: Shared Time Utility Module

**Created:** `src/utils/timeUtils.js`

Exports four functions that are now the single source of truth:

- `msUntilNextFire(timeStr, days)` — milliseconds until next alarm fire
- `nextFireDate(timeStr, days)` — next fire as a `Date` object
- `formatCountdown(ms)` — human-readable countdown string ("in 2h 15m", "in 45m", "now")
- `getMyDayIcon(alarms, routines)` — Tabler icon class for My Day nav item

**Updated files:**

| File | Change |
|---|---|
| `src/pages/Alarms.jsx` | Removed local `msUntilNextFire` + `formatCountdown` (lines 110–138); added import |
| `src/hooks/useAlarmTimer.js` | Removed local `msUntilNextFire` + `formatCountdown` (lines 56–91); added thin wrapper |
| `src/pages/Dashboard.jsx` | Removed local `nextFireDate` + `formatDiff` (lines 19–41); aliased `formatCountdown` as `formatDiff` |
| `src/components/Sidebar.jsx` | Removed local `getMyDayIcon` (lines 15–42); added import |
| `src/components/BottomNav.jsx` | Removed local `getMyDayIcon` (lines 6–30); added import |

### Fix 2: Remove console.log from Production

Removed all 7 `console.log` statements. All `console.warn` and `console.error` calls were intentionally retained as they surface real error conditions.

### Fix 3: ErrorBoundary Component

**Created:** `src/components/ErrorBoundary.jsx`

- Class component using `getDerivedStateFromError` + `componentDidCatch`
- Shows a friendly "Something went wrong — Reload App" screen instead of blank white
- In development mode, renders the error stack trace for debugging
- Wrapped around the entire `<App />` tree in `App.jsx`

### Fix 4: Dead CSS Removal

Removed `.qa-sync-msg--ok`, `.qa-sync-msg--error`, `.qa-sync-msg--syncing` from `Dashboard.css`. These were never referenced in any JSX.

### Fix 5: CSS Deduplication

Removed 10 redundant `box-sizing: border-box` declarations and 2 redundant `overflow-x: hidden` declarations from individual CSS files. The global rules in `global.css` already cover all elements.

### Fix 6: Broken Import Path

Fixed `Onboarding.jsx` — changed `require('../firebase')` to `require('../firebase/config')`. This was a latent bug that caused a module-not-found warning in every production build.

### Fix 7: Unused State Cleanup

Removed `handleSync`, `syncStatus`, and `syncMsg` from `Dashboard.jsx`. The sync function was implemented but never wired to any UI element. The code is preserved in a comment for future FAB integration.

---

## Phase 5 — Control

### Loading Skeleton

Added shimmer skeleton rows to the My Day page. While Firestore is loading (`alarmsLoading === true`), three animated placeholder rows are shown instead of an empty state. This prevents the jarring flash from "empty" to "populated" on first load.

**CSS animation:** `@keyframes mars-shimmer` with a 1.4s gradient sweep, using CSS custom properties from `global.css` for consistent theming.

### All Async Handlers Already Guarded

Audit confirmed all async handlers in `Settings.jsx`, `Login.jsx`, `Alarms.jsx`, and `Dashboard.jsx` already have `try/catch` blocks with user-facing error messages. No additional guards were needed.

---

## Results

| Metric | Before | After | Delta |
|---|---|---|---|
| Duplicate function implementations | 5 functions × 3 locations | 1 canonical location each | −10 function bodies |
| `console.log` in production | 7 | 0 | −7 |
| ErrorBoundary | None | Full app wrapped | +1 |
| Dead CSS classes | 3 | 0 | −3 |
| Redundant CSS declarations | 12 | 0 | −12 |
| Broken import paths | 1 | 0 | −1 |
| Loading skeleton | None | Shimmer rows | +1 |
| Gzip JS bundle | 321.07 KB | 319.17 KB | −1.9 KB |
| Files changed | — | 19 | — |

**Commit:** `4bddb3b` on `main`  
**Vercel deploy:** Auto-triggered — live at [mars-lyart-alpha.vercel.app](https://mars-lyart-alpha.vercel.app)

---

## Remaining Backlog (Future Sessions)

The following items were identified during the audit but deferred to keep this commit focused:

1. **`useAlarms.js` `nextFireTime`** — The scheduling helper returns an ISO string (not a `Date`), so it cannot be directly replaced by `timeUtils.nextFireDate` without wrapping. A future refactor can add a `nextFireISO` export to `timeUtils.js`.
2. **`serviceWorkerRegistration.js` `nextLinkFireTime`** — Same pattern as above; a third scheduling helper that duplicates the logic but returns ISO strings for the SW.
3. **`useRoutines.js` `nextRoutineFireTime`** — Fourth scheduling helper; same ISO-string contract.
4. **Pre-existing ESLint warnings** — `touchStart` unused in App.jsx, `queryPermission` unused in useMars.js, `setLoading` unused in useLocalStorage.js — these are pre-existing and not introduced by this refactor.

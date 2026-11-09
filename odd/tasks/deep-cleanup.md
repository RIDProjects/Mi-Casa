# Deep cleanup
Behavior-preserving cleanup of backend, frontend and mobile; branch chore/deep-cleanup off dev; one PR per package (stacked) if over ~400 lines.

## Specs
- S1: "corre una limpieza profunda de todo el codigo de toda la aplicacion" -> remove dead code across backend, frontend and mobile without changing behavior.
- S2: Scope (parent's reading of S1, user may correct): unused imports/locals/parameters (tsc --noUnusedLocals --noUnusedParameters), stray console.log/debug in non-test source, commented-out code blocks, unreferenced files and unused exports (verified by grep/codegraph, Next pages/Nest modules/migrations/entities are NOT dead by reference count), duplicated helpers that can be merged safely.
- S3: Out of scope: dependency removals (report only), `any` typings (456 lint warnings, report only), renames of API routes/DTOs/entity columns, deleting or editing migrations, UI/copy changes.
- S4: Every package must keep tests, tsc and lint green and unchanged in results (baseline: backend 387 tests, frontend 135, mobile 351).

## Tasks
- T1 (S1-S4) backend | worker | done: 2 unused findings fixed, 453 lint warnings (was 456), 387 tests | commit: see git log
- T2 (S1-S4) frontend | worker + parent | done: 10 unused fixed, unused updateListMut removed, deleted unreferenced ui/index.ts and ui/Table.tsx; 135 tests, tsc/lint clean | commit: see git log
- T3 (S1-S4) mobile | worker | commit: pending
- T4 verify all suites, report, PRs to dev | inline | commit: pending

## Log
- L1: "corre una limpieza profunda de todo el codigo de toda la aplicacion"

# Post-launch bug fixes (Mi Casa Pro)

Source: read-only audit 2026-10-10 (backend, frontend, mobile). Baseline: backend 44/44,
frontend 18/18, mobile 23/23 tests green; tsc clean in all three.

User decisions (2026-10-10):
- Alert emails go to the house admins (house_admin members of that house).
- Exchange rates become per-house; existing global rows are copied to every house.
- Permissions: members can view/create/edit/delete in every module; only admins manage
  members, currencies and house settings.

## Tasks
- [x] 1. Security: never expose resetToken/resetTokenExpiry (members, users, profile). Done: b5ab2d3 (RED 11 failing -> GREEN 61/61, tsc clean).
- [x] 2. Exchange rates per house (migration copies existing rows to each house), scoped reads/writes, restricted writes, rate > 0. Done: bde49e4 (RED 6 failing -> GREEN 68/68; migration up/down/up verified on postgres:15 with 2 houses x 3 rates = 6 rows).
- [x] 3. Base currency switch (CUP bug): transactional setLocal that rebases rates and expense snapshots; no silent rate 1; inverse-rate fallback; single local currency. Done: d3a5851 (RED backend 8 + frontend 2 failing -> GREEN backend 76/76, frontend 22/22; migration verified on postgres:15). Not rebased: budgets, debts, cards, loans, purchases, savings, emergency fund (stored implicitly in local currency).
- [x] 4. Alert emails to house admins, dedup before sending. Done: 2815ec2 (RED compile+behavior -> GREEN 86/86; admin query verified on postgres).
- [x] 5. Web: 401 interceptor must not reload login on bad credentials. Done: 3c44329 (RED 6 failing -> GREEN 29/29; Layout guard still protects pages).
- [x] 6. Dates: parse YYYY-MM-DD as local dates; "today" in local time (web, mobile, backend default month). Done: 7680417 (RED missing utils -> GREEN frontend 34, mobile 28, backend 88; also green without TZ).
- [x] 7. Currency UX: mobile expense default currency, remove hardcoded CUP labels, safe Intl formatter, CurrencyInput symbol. Done: bf65f97 (RED frontend 9 + mobile 3 failing -> GREEN frontend 44, mobile 31).
- [x] 8. Backend validation: invite/create-member DTOs + only house admins invite, registration localCurrencyCode, lowercase emails, rate @Max, month param, CSV without file, savingsTargetPercent 0. Done: 831098f (specs on HEAD: 5/6 suites fail, 18 tests; invite DTO spec not RED-able (new file) -> GREEN 129/129).
- [x] 8b. Interest rates as percent: widen credit_cards.annualRate and savings_goals.annualInterestRate (numeric(5,4) rejects >= 10%), savings PMT treats the UI percent as a fraction (5% computed as 500%). Done: 0f4c983 (RED PMT 7.77 vs 97.73 + rate 24 rejected + FI 0.07 -> GREEN 131/131; migration up/down/up verified, only FI goal converted).
- [x] 9. Users without an active house get 4xx instead of 500. Done: 76a1c7f (RED helper missing + summary reached service with '' -> GREEN 138/138; net-worth, recurring, notifications, push swapped by parent).
- [x] 10. Logout clears query caches and persisted currency store (web, mobile). Done: 5e9daef (RED web 2 + mobile 2 failing -> GREEN web 47, mobile 33).
- [x] 11. Permissions: members full CRUD on modules; admin-only management. Done: 2f6258d (RED missing module -> GREEN 155/155; migration verified 6->12 links, revert, idempotent).
- [x] 12. Throttling: trust proxy, auth throttle keys, reset-password throttle. Done: ed94418 (RED 7 throttle + trust-proxy missing -> GREEN 169/169; worker stalled, finished inline by parent).

Deferred (not in scope): debt payoff strategies, purchase totals across currencies,
investments currency enum, month-end date overflow in cuotas/loans, weekly budget factors,
JWT refresh/revocation.

## Delivery (2026-10-10)
- Chained PRs #2-#10 (stacked-to-main), each natively reviewed and approved before merge; all merged (main aa46f0e).
- Extra commit 2257334: Jest globalSetup TZ so date tests pass in UTC CI (found by CI on PR #6).
- Root cause of the customer CUP error: production backend had not been deployed since 2026-09-04 while Vercel shipped the 2026-09-28 frontend (PUT set-local -> 404).
- Backups: ~/Backups/mi-casa-pro/prod-20261010-153404.dump and prod-predeploy-20261010-155434.dump (pg_dump -Fc via railway ssh).
- Rehearsal: all 6 pending migrations applied to a restored prod copy (Postgres 18) and set-local smoke-tested.
- Backend deployed with railway up (deployment 78404496, SUCCESS); 6 migrations applied; set-local now 401 unauthenticated (was 404).
- Mobile published via EAS update to branch/channel preview (runtime 1.0.0, environment preview), update group 5e0713e8-c2ea-4cef-af78-2c13905d6207.

## Follow-ups from review (non-blocking)
- Concurrent setLocal can double-rebase (serialize per house).
- Alert email loop aborts remaining admins on first send failure.
- Invalid APP_TIMEZONE throws RangeError.
- Market purchases totalCUP sums mixed currencies but is labelled with the local code.
- Web user switch should also clear the react-query cache in setAuth.
- Clear the outstanding reset token in production.

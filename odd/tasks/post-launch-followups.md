# Post-launch follow-ups (Mi Casa Pro)

Source: read-only verification of pending items on main aa46f0e (2026-10-10).
Delivery: one work-unit commit per task, stacked PRs to main, native review before each merge.

## Tasks
- [x] 1. setLocal: serialize per house (row lock) so concurrent calls cannot double-rebase expenses. Done: f797579 (RED 1 failing -> GREEN 172/172).
- [x] 2. Market purchases total: convert each item to the local currency instead of summing raw mixed currencies (backend + web + mobile labels). Done: acd7e58 (RED compile + mobile helper -> GREEN be 175, fe 47, mobile 36).
- [x] 3. Upcoming bills dates: compute in APP_TIMEZONE with date-string arithmetic; clamp day 29-31 to month end (cuotas next payment, loans diaPago); include cuotas due today. Done: 04ca633 (RED 4 failing + helpers missing, TZ=UTC -> GREEN 183/183).
- [x] 4. Debt payoff strategies: roll freed minimum payments into the extra payment; stop when no payment reduces balances. Done: 88a351e (RED 7 failing -> GREEN backend 193/193; payoff.tsx shows feasible flag, tsc/lint OK, no page test).
- [x] 5. Register: accept only known currency codes (CURRENCY_META). Done: c2521eb (RED XYZ accepted -> GREEN 200/200).
- [x] 6. Hardening: APP_TIMEZONE validation with fallback; clear react-query cache when a different user logs in (web); declare house_invitations indexes on the entity; CSV quote only special at field start. Done: c601322 (RED be 2 + fe 1 failing -> GREEN be 202, fe 49; index drift gone on postgres).
- [x] 7. Update README and in-app guide (/guia, mobile help if any) for user-facing changes from #2-#16. Done: c98c929

Out of scope (needs user decision): investments currency enum (migration), weekly/biweekly budget factors, JWT refresh/revocation, clearing the production reset token.

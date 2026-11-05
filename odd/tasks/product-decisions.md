# Product decisions batch (Mi Casa Pro)

User decisions (2026-10-10):
- Weekly budget factor 52/12 (4.33); "quincenal" means every 15 days -> 365/15/12 (2.03).
- Investments accept the currencies the house has configured (house_currencies), not a fixed enum.
- Session revocation: per-user token version; bump on password reset, deactivation and "close all sessions".
- Clear the outstanding production reset token.

## Tasks
- [x] 1. Clear the outstanding reset token in production (backup first). Done: backup prod-pre-token-clear-*.dump; UPDATE 1, 0 remaining (data-only, no commit).
- [x] 2. Budget periodicity factors: weekly 52/12, biweekly 365/15/12. Done: ce3557b (RED 2 failing -> GREEN 205/205; also 832d970 fixes evening-only UTC flake in setLocal specs).
- [x] 3. Investments: currency = any active currency of the house (enum -> varchar migration). Done: b33d828 (RED DTO+service -> GREEN 214/214; migration up/down/up verified on postgres:18, CUP row kept).
- [x] 4. Session revocation: tokenVersion column, checked by JWT strategy; bump on reset/deactivate/logout-all; endpoint + web button. Done: b581d86 (RED guard/service/web -> GREEN be 222, fe 52; migration verified on postgres:18).
- [x] 5. Update README and module guide. Done: 6f5dd6d.

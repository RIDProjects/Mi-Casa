# Mobile redesign (port the web Pro-Ledger redesign to the native app)
Branch flow: feature branch -> PR into `dev` -> `staging` -> `main`; ship to phones with `eas update` (OTA).
Hard constraint: OTA only. No new native modules (no react-native-svg, reanimated, linear-gradient, haptics, secure-store).

## Specs
S1. "no actualizaste la ui de l aaplicacion mobile" — the native app never got the redesign (PRs #23-#29 and the ledger UI only touched the web).
S2. "Rediseño completo" — all screens of the native app reproduce the web redesign: Pro-Ledger tokens (light + dark), new logo, "fondo Libro contable", budget rings, cards/buttons/typography, entrance animations, loading/empty/error states.
S3. Existing behavior of every screen keeps working (data, forms, navigation, delete account, notifications).
S4. "al final deja solo el deploy solo desde produccion" — the GitHub workflow that runs `eas update` must run only from production (`main`).

## Tasks
- [x] T0 (S4) GitHub workflow `deploy-mobile.yml` that runs `eas update` per branch (dev/staging/main) + docs. Route: inline, separate PR. Commit: PR #41 (c7edceb); S4 final: only from main, still to do in T7
- [x] T1 (S2) Foundation: theme tokens light/dark + ThemeProvider/useTheme, fonts, core components (Screen+ledger background, Card, Button, Input, Badge, StatCard, ProgressBar, ProgressRing, Skeleton, EmptyState, ErrorState, Logo, PageHeader, reveal animation), tab bar. Route: inline. Commit: 6a5987d
- [ ] T2 (S2,S3) Login + Profile + Privacy policy + navigation headers. Route: worker. Commit: -
- [x] T3 (S2,S3) Dashboard / Inicio (summary, rings, cards, cuotas, notifications bell). Route: worker. Commit: 704c37c
- [x] T4 (S2,S3) Budget + Metas. Route: worker. Commit: baf32cf
- [x] T5 (S2,S3) Gastos: Expense registry, Shopping list, Add household expense. Route: worker. Commit: 92571c3
- [x] T6 (S2,S3) Debts (summary, add) + Vencimientos + Notificaciones. Route: worker. Commit: f7f51c2
- [ ] T7 (S1,S3) Integration: verify every screen in web harness (light/dark), tests, tsc, PRs through dev/staging/main, eas update to preview. Route: inline. Commit: -

## Log
L1. user (original, this feature): "no actualizaste la ui de l aaplicacion mobile"
L2. user choice: "Rediseño completo" (over foundation-only and foundation+key screens).
L3. user: "cuando termines continua / que deverias hacer un deploymente en github que lance el eas update para expo"
L4. user: "creo que sera mejor que uno por cada rama" (merged as per-branch deploy), then final: "al final deja solo el deploy solo desde produccion" -> S4 rewritten: eas update runs only from `main`/production.

## Conventions (T1 done, commit on feat/mobile-redesign, worktree /tmp/mc-mob/finanzas-app/mobile)
- Tokens: `src/theme/tokens.ts` (ThemeColors: surface, panel, surfaceLow, surfaceContainer, surfaceHigh, border, onSurface, onSurfaceVariant, outline, primary, brand, onBrand, ok/warn/danger/infoInk + *Tint, overlay; `fonts`, `radius`, `Tone`, `toneInk`, `toneTint`).
- Theme: `useTheme()` -> `{colors,isDark,mode,setMode,toggle}`; styles via module-level `const createStyles = (c: ThemeColors, isDark: boolean) => StyleSheet.create({...})` + `const styles = useThemedStyles(createStyles)` in the component. Never import `Colors` from `theme/colors` for UI colours (only `Colors.categories` stays until replaced).
- UI kit: `src/components/ui` (Screen, LedgerBackground, Reveal, Card, Button, TextField, Badge, StatCard, ProgressBar, ProgressRing, Skeleton, EmptyState, ErrorState, PageHeader, Logo). Screens wrap content in `<Screen>` (ledger background + safe area + optional pull-to-refresh) and stagger cards with `<Reveal index={n}>`.
- Fonts: no fontWeight; use `fonts.*` families (Inter body, `fonts.title` Work Sans for headings/big numbers).
- No new native modules (no svg, reanimated, linear-gradient, haptics). OTA only.
- Visual check: web harness `cd /tmp/mc-mob/finanzas-app/mobile && CI=1 npx expo start --web --port 8099` (already running) and `node /tmp/pw/mob.js <out.png> <dark|light> [path]` (390x844). Unauthenticated shows Login; authenticated screens need mocked API routes (see /tmp/pw/mob.js).
- Verify each task: `npx tsc --noEmit`, `npx jest`, and a screenshot in dark and light.

Delivery: one feature branch feat/mobile-redesign (T1-T6 as separate commits), single PR into dev at T7 (slice boundary: the kit+screens ship together because every screen depends on the kit; review per commit).

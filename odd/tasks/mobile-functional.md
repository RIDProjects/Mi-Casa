# Mobile functional features (write operations + web modules in the native app)
Flow: feature branch feat/mobile-functional (worktree /tmp/mc-fn) -> PR dev -> staging -> main; the push to main starts the EAS Workflow (user approves in expo.dev). OTA only: no new native modules (push, SecureStore, biometrics wait for one native build).

## Specs
S1. "ok me parece bien" — go ahead with the proposal: mobile must not be view-only; start with (2) manage data from the phone: "crear y editar metas, aportar a una meta y editar el presupuesto. También faltan los ingresos, ya que solo se registran gastos."
S2. "le agregarias algunos modulos de los que hay en la web a la app mobile ?" — add web modules to mobile: tarjetas y cuotas, fondo de emergencia, patrimonio (solo lectura); movimientos/ingresos.
S3. Navigation: a "Más" tab groups Deudas, Movimientos, Tarjetas, Cuotas, Fondo, Patrimonio, Vencimientos and Perfil (6 tabs do not fit more).
S4. Stays on the web: admin, analytics, simulador, inversiones, liquidación de deudas.
S5. Existing mobile behaviour keeps working; every new screen follows the Pro-Ledger kit (see odd/tasks/mobile-redesign.md `## Conventions`), light and dark, with loading/error/empty states and validation messages.
S6. "tantas pantallas no cargaran la app?" — adding screens must not make the app heavier: measure the JS bundle before/after (today ~4.2 MB hbc for iOS/Android) and stop the 10 s polling on screens that are not focused.

## Tasks
- [x] T1 (S1,S5) Metas: create, edit, delete, add contribution (backend: savings-goals POST/PUT/DELETE, DTO nombre/montoMeta/ahorrosActuales/mesesParaAhorrarla/tasaInteres/emoji). Route: worker. Commit: 01e5ee8
- [x] T2 (S1,S2,S5) Movimientos: list by month + register income/expense (backend: transactions, CreateTransactionDto tipo/concepto/categoria/monto/metodoPago/fecha/notas). Route: worker. Commit: 81ee576
- [x] T3 (S1,S5) Presupuesto edit: income sources, categories, expenses (backend budget routes: POST :id/income, PUT/DELETE income/:id, POST :id/categories, PATCH/DELETE categories/:id, POST categories/:id/expenses, PUT/DELETE expenses/:id). Route: worker. Commit: 87a86e0 (income has no periodicity in the backend DTO: name/type/monthly amount)
- [x] T4a (S2,S5) Tarjetas de crédito: screens + root-stack routes (visual check deferred to T6 when reachable). Commit: da8efad
- [x] T4b (S2,S5) Cuotas: screens + routes (cuotas.service and its tests are already in da8efad). Route: worker. Commit: 4e316ed
- [x] T5 (S2,S5) Fondo de emergencia + Patrimonio (read-only). Route: worker. Commit: 5a23ce9
- [x] T6 (S3) "Más" tab hub and navigation. Route: inline. Commit: 1f4e112
- [x] T6b (S6) Performance guard: poll only the focused screen (global refetchInterval 10 s in App.tsx today keeps every visited tab polling); bundle size before/after (size still to measure in T7). Route: inline. Commit: 1f4e112
- [ ] T7 (S5) Verify all, PRs dev -> staging -> main, user approves the EAS run. Route: inline. Commit: -

## Log
L1. user: "ok me parece bien" (after my analysis: push, manage data from the phone, SecureStore/biometrics, offline cache, missing web modules; recommended starting with (2) because it ships OTA)
L2. user: "le agregarias algunos modulos de los que hay en la web a la app mobile ?"
L3. user: "tantas pantallas no cargaran la app?"

# Budget multi-currency
Budget expenses and income sources get a currency; totals convert to the house local currency at read time.
Branch feat/budget-multicurrency off dev; PRs go to dev (stacked: backend / mobile / web).

## Specs
- S1: "ahora mismo con los datos actuales estoy en -47 mil poque ve los cup como usd" -> budget totals (income, expenses, available, dashboard) must convert each line to the house local currency instead of summing raw amounts.
- S2: "a la hora de agregar un gasto lo hace en usd obligatorio y deberia dejarme seleccionar la moneda" -> expense (and income) forms on mobile and web let the user pick the currency.
- S3: Decision (user chose "Tasa actual al leer"): each line stores its currency (empty = house local currency, existing data untouched); totals convert with the latest house rate at read time; a line with no rate is flagged and not summed.

## Tasks
- T1 (S1,S3) backend: migration + entity/DTO currency + computeSummary conversion + tests | worker | commit: see git log (feat(budget): currency per line...) | done, 383 backend tests, tsc clean
- T2 (S2) mobile: picker in ExpenseFormModal/IncomeFormModal, per-line currency display | inline | commit: pending
- T3 (S2) web: picker in presupuesto forms, per-line currency display | inline | commit: pending
- T4 verify suites, PR to dev; promotion only after user confirms (migration on prod) | inline | commit: pending

## Log
- L1: "ahora mismo con los datos actuales estoy en -47 mil poque ve los cup como usd ademas qeu a la hora de agregar un gasto lo hace en usd obligatorio y deberia dejarme seleccionar la moneda"
- L2: user chose "Tasa actual al leer (recomendado)" for conversion.

## Delivery
- Slice boundary after T1 (609 lines on the branch): stacked PRs backend (T1) -> mobile (T2) -> web (T3) so each review stays focused.

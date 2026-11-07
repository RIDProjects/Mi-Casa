# Debt priority + offset against what is owed to the user

Debts get a priority (alta/media/baja). What people owe the user ("me deben") is applied against the user's debts ("debo") in priority order; only what is left uncovered feeds the budget "Deudas" category.
Branch: feat/debt-priority-offset (from dev).

## Specs
- S1: "vamos a modificar la deuda  para que halla un campo qeu duga prioridad y marcamos alta media y baja" -> debts get a `priority` field with values alta / media / baja.
- S2: "vas a sumar todo lo que me deben y vas a ir tomando el primer valor de debo y vas a restar el total de me deben contra el yo debo y el resto de esa resta con el siguiente" -> pool = sum of unpaid "me deben"; walk the unpaid "debo" debts and subtract each from the pool, carrying the remainder to the next.
- S3: "ya cuando encuentres a uno que no se puede restar entonces a partir de ahi es qeu lo vas a poner en deudas en presupuesto y solo vas a poner el valor una vez restado aunqeu sea pequeño" -> the first debt the pool cannot fully cover goes to the budget "Deudas" with only its uncovered remainder (even if small).
- S4: "por ejemplo me deben 2000 usd y tengo pos 1 500 pos 2 1000 y pos 4 600 cuando restas solo faltarian 100 de la pos 3 entonces ese es el valor qeu vas a poner y el valor total del resto de deudas en caso de que halla pos 4 pos 5 etc" -> example: owed 2000; pos1 500, pos2 1000, pos3 600 -> covered 1500, 100 left uncovered on pos3 goes to the budget, and the rest (pos4, pos5...) go with their full balance.
- S5: "esta operacion matematica la vas a hacer teniendo en cuenta las prioridades de mas alta a menos alta para asi priorizar las deudas mas proximas pero poder presupuestar las de menos importancia para el futuro" -> walk order is priority alta, media, baja.
- S6 (user choice, option 2): the budget line is a MONTHLY amount: the uncovered balance of each debt, with its minimum payment (capped at that balance) or 5% of that balance when it has none (estimated). Debts fully covered by what is owed do not appear in the budget.
- S7 (assumptions, adjustable): existing debts default to "media"; ties inside a priority are walked oldest first (createdAt); amounts are not currency-converted (same as today); only debts of type i_owe and unpaid ones take part; loans, cuotas and cards are not touched by this offset.
- S8: the Debts page shows the result of the offset (pool, per debt: covered / partially covered / pending) because the user described it "en el apartado de deudas".

## Tasks
- [x] T1 (S1) backend: Debt.priority column (alta/media/baja, default media), migration, DTOs. Route: inline. Done: 3 DTO tests (RED 3 failing) -> GREEN; migration written but NOT run on a database (docker daemon off). Commit: see git log (feat(debts): priority offset)
- [x] T2 (S2-S7) backend: pure computeDebtOffset + DebtLinesService uses it for i_owe debts + GET /debts/offset + tests. Route: inline. Done: 7 offset tests + 6 debt-lines tests (RED 5 failing) -> GREEN, backend 369/369, tsc clean. Commit: same as T1
- [x] T3 (S1,S8) web: priority in the debt form/table (badge, sortable, default order by priority) + offset panel on the Debts page. Route: inline. Done: 4 new tests (RED 4 failing) -> GREEN, web 128/128, tsc clean, lint 0 errors. Commit: see git log (feat(web): debt priority)
- [x] T4 (S1,S8) mobile: priority chips in the debt form (debts I owe only), priority + coverage badges on the debt cards, debts I owe listed by priority, 'Cobertura con lo que te deben' card. Route: inline. Done: 5 new/updated tests (RED 5 failing) -> GREEN, mobile 341/341, tsc clean. Commit: see git log (feat(mobile): debt priority)
- [x] T5 guide/docs update (guia.html note + summary row). Route: inline. Done: guia test passes. Commit: same as T4

## Delivery
- Slice 1 (PR to dev): T1-T2 backend. Slice 2: T3 web. Slice 3: T4 mobile + T5 docs. Stacked as in debt-health.

## Log
- L1 (2026-11-07): "vamos a hacer una cosa vamos a modificar la deuda  para que halla un campo qeu duga prioridad y marcamos alta media y baja luego vamos a hacer esto en el apartado de deudas vas a sumar todo lo que me deben y vas a ir tomando el primer valor de debo y vas a restar el total de me deben contra el yo debo y el resto de esa resta con el siguiente ya cuando encuentres a uno que no se puede restar entonces a partir de ahi es qeu lo vas a poner en deudas en presupuesto y solo vas a poner el valor una vez restado aunqeu sea pequeño por ejemplo me deben 2000 usd y tengo pos 1 500 pos 2 1000 y pos 4 600 cuando restas solo faltarian 100 de la pos 3 entonces ese es el valor qeu vas a poner y el valor total del resto de deudas en caso de que halla pos 4 pos 5 etc y obviamente esta operacion matematica la vas a hacer teniendo en cuenta las prioridades de mas alta a menos alta para asi priorizar las deudas mas proximas pero poder presupuestar las de menos importancia para el futuro"
- L2 (2026-11-07): answer to "¿qué monto va como línea automática en Deudas del presupuesto?": "Pago mensual del saldo pendiente (recomendado)" (option 2)

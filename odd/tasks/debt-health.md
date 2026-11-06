# Debt health (budget "Deudas" + debts modules -> dashboard verdict)

Automatic "Deudas" budget category fed by the debt modules, plus a dashboard verdict on whether the debts are manageable short or medium term.
Branch: feat/debt-health (from dev). Option chosen by the user: automatic category (not manual).

## Specs
- S1: "una cosa en presupuesto hay un apartado que es deudas pero tenemos el modulo de deudas eso es funcional a dia de hoy ?" -> answered: the debts module works (people debts, interest, minimum payment, avalanche/snowball/minimum simulation) but is not connected to the budget; the budget "Deudas" category is only a manual monthly line.
- S2: "podriamos hacer los calculos pertinentes para que desde el dashboard teniendo en cuenta el modulo de deuda y de presupuesto se pueda saber si estoy bien o mal con las deudas y si podre solventarlo en el corto o mediano plazo ?" -> a dashboard card (web + mobile) with a verdict (bien / atencion / riesgo), the debt-to-income ratio, free monthly margin and an estimated payoff horizon (corto <= 12 meses, mediano 12-36, "no alcanza" otherwise).
- S3: User chose option 1: the budget "Deudas" category is calculated automatically from the debt modules (loans monthly payment, active cuotas installment, I_OWE debts minimum payment, credit cards estimated minimum).
- S4 (assumption, adjustable): existing manual expenses in the "Deudas" category are kept and still counted; the automatic lines are added as separate read-only lines flagged "Automático" so the user can spot and remove manual duplicates. Credit cards have no minimum-payment field: cards paid in full (tipoPago full) count 0 (regular spending); other cards with balance count 5% of the current balance, same 5% convention the debts payoff uses.
- S5: Thresholds for debt-to-income (monthly debt service / monthly income): < 20% bien, 20-35% atencion, > 35% riesgo.

## Delivery
- Slice 1 (PR to dev): T1-T3 backend (feat/debt-health, 2 commits, ~600 lines incl. tests). Slice 2: T4 web (feat/debt-health-web, stacked). Slice 3: T5 mobile + T6 docs (feat/debt-health-mobile, stacked).

## Tasks
- [x] T1 (S3,S4) backend debt-lines service: monthly debt service lines from debts/loans/cuotas/cards + tests. Route: inline. Done: 7 tests GREEN (RED: suite failed to load), tsc clean. Commit: pending (committed with T2)
- [x] T2 (S3) budget integration: BudgetService adds the automatic lines to the "Deudas" category and to summary totals + tests. Route: inline. Done: 4 new tests (RED: TS errors, no autoDebtLines) -> GREEN, backend 338/338, tsc clean. Commit: see git log (feat(budget): automatic debt lines)
- [x] T3 (S2,S5) backend debt-health endpoint GET /summary/debt-health: DTI, free margin, payoff horizon, verdict + tests. Route: inline. Done: 12 new tests (RED: module missing) -> GREEN, backend 350/350, tsc clean. Commit: see git log (feat(summary): debt health)
- [ ] T4 (S2,S3) web: dashboard card + automatic lines in the budget Deudas category. Route: inline. Commit: pending
- [ ] T5 (S2,S3) mobile: dashboard card + budget lines. Route: inline. Commit: pending
- [ ] T6 guide/docs update. Route: inline. Commit: pending

## Log
- L1 (2026-11-06): "una cosa en presupuesto hay un apartado que es deudas pero tenemos el modulo de deudas eso es funcional a dia de hoy ? podriamos hacer los calculos pertinentes para que desde el dashboard teniendo en cuenta el modulo de deuda y de presupuesto se pueda saber si estoy bien o mal con las deudas y si podre solventarlo en el corto o mediano plazo ?"
- L2 (2026-11-06): "la 1" (answering: "¿qué hacemos con la categoría "Deudas" del presupuesto? 1. Calcularla automáticamente ... 2. Dejarla manual")

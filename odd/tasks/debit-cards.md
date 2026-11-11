# debit-cards
Allow registering debit cards next to credit cards. Debit is record-only and never counts as debt.
Branch: feat/debit-cards (from main). Flow: PR to dev.

## Specs
- S1: "el sistema te deja agregar solo tarjetas de credito y las de debito no" — a card has a type: credit or debit; existing and legacy cards are credit.
- S2: Debit card = "Solo registro": banco, nombre, saldo disponible. No limit, rate, cut/payment dates.
- S3: Debit does NOT count as debt in summary, debt lines, net worth, bills, health score.
- S4: Same Tarjetas screen: Crédito/Débito selector in the form; list shows both; debt totals only over credit cards.

## Tasks
- [x] T1 (S1-S3) backend: entity `cardType` + migration, DTO `tipo`, service, summary/debt-lines filters, tests — inline — commit: 80e62aa
- [x] T2 (S1,S2,S4) web: tarjetas.tsx + patrimonio.tsx — inline — commit: 2309df0
- [x] T3 (S1,S2,S4) mobile: types, form, TarjetasScreen, DashboardScreen, netWorth.service + tests — inline — commit: this slice

## Log
- L1: "vamos al lio me di cuenta que el sistema te deja agregar solo tarjetas de credito y las de debito no"
- L2: decision: debit = "Solo registro (Recomendado)"; location = "Misma pantalla Tarjetas (Recomendado)".

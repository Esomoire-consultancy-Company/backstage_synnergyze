# BNR / Synnergyze Client Success Operating Model

## Purpose

This document defines the first commercial operating model for using Backstage Synnergyze as a per-client service assurance cockpit.

The portal should not only track software services. It should track each client from their earning point of view:

- what revenue was sourced or enabled,
- what service was assured,
- what expense was charged,
- what evidence was captured,
- what settlement was routed through SILK,
- what consumer or company wallet/card was affected,
- and whether the client is measurably better off.

## Core Equation

```text
Client Net Benefit =
Verified Revenue Generated
+ Cost Saved
+ Faster Settlement Benefit
+ Credits / Rewards Earned
- Platform Fees
- Service Assurance Cost
- Wallet / Card / Settlement Cost
- Tax / Compliance Admin Cost
- Guarantee / Reserve Contribution
```

The main success metric is:

```text
Client Success Ratio = Client Net Benefit / Client Total Expense
```

Suggested interpretation:

- below 1.0x: client is not yet commercially justified,
- 1.0x to 1.5x: weak success; needs service improvement,
- 1.5x to 3.0x: acceptable success,
- 3.0x to 5.0x: strong success,
- above 5.0x: excellent success and renewal candidate.

## Operating Actors

| Actor | Commercial role | System role |
| --- | --- | --- |
| BMP | Revenue intake, leads, orders, market relationship | CRM / Revenue Master |
| Synnergyze | Service assurance, implementation, field ops, tickets | Assurance Cockpit / Backstage portal |
| SILK | Wallet, card, escrow, payout, settlement records | Settlement ledger |
| DigitalMe | Identity, consent, wallet ownership, consumer services | User and company identity spine |
| BNR | Registry, governance, policy, MIS, audit discipline | Governance and reporting spine |
| Creators Common | Problem discovery, new solutions, social innovation | Social innovation wing |
| Believers Common | Guarantee, enterprise trust, reserve, policy approval | Enterprise guarantee wing |

## Revenue and Expense Flow

```text
BMP CRM Revenue Master
  -> Client Revenue Opportunity
  -> Synnergyze Service Assurance Plan
  -> Quantum Room / Runtime / SLA / Ticket
  -> River Evidence + Warden Review
  -> SILK Wallet / Card / Escrow / Settlement
  -> DigitalMe Consumer / Contributor / Company Record
  -> Client Success P&L Card
```

## Minimum Client Record

Every client should have a success card with these fields:

| Field | Description |
| --- | --- |
| Client ID | BNR / Synnergyze client reference |
| Client Type | individual, creator, SME, factory, enterprise, civic node |
| BMP CRM ID | source revenue record |
| DigitalMe ID | identity authority |
| SILK Wallet ID | settlement and value account |
| Service Package | Synnergyze package being delivered |
| Verified Gross Revenue | revenue enabled or processed |
| Client Total Expense | total cost charged to client |
| Client Net Benefit | post-expense benefit |
| Success Ratio | net benefit divided by total expense |
| SLA Level | service assurance class |
| Evidence Status | pending, sufficient, exception, closed |
| Settlement Status | pending, held, cleared, disputed |
| Tax MIS Status | draft, review, ready, filed |
| Believers Guarantee | none, moral, service, financial, programme |
| Creators Link | problem, innovation, community or creator origin |

## Expense Charging Principle

The client should pay because the system proves one or more of the following:

1. revenue was generated,
2. cost was saved,
3. settlement became faster or safer,
4. service continuity improved,
5. the client gained trust, proof, eligibility, or credit value.

The commercial objective is not to maximize client fees. The objective is to maintain a visible success ratio where the client can see that the system is worth more than it costs.

## MIS Ledgers

Separate the ledgers to avoid confusion.

| Ledger | Tracks |
| --- | --- |
| Commercial MIS | BMP revenue, Synnergyze fees, client expenses, invoices |
| Settlement MIS | SILK wallet inflow/outflow, escrow, payouts, cards, refunds |
| Civic / Community MIS | grants, donations, sponsorships, welfare backflow, public-good activity |
| Governance MIS | guarantees, reserves, audit costs, approvals, disputes |

## Two-Wing Governance Split

### Creators Common

Creators Common is the social and innovation wing. It finds problems, creates solutions, tests pilots, records contributors, and empowers communities.

Assets here include:

- problem statements,
- concept notes,
- community projects,
- creator records,
- training materials,
- research and field notes,
- early innovation IP drafts,
- proof of participation and impact.

### Believers Common

Believers Common is the enterprise guarantee and stewardship wing. It approves, protects, guarantees, reserves, certifies, and governs serious programmes.

Assets here include:

- guarantee reserves,
- programme approvals,
- enterprise trust marks,
- governance records,
- audit records,
- treasury rules,
- lawful asset custody records,
- verified representation records.

## System Rule

```text
Creators Common creates.
Believers Common guarantees.
BNR records.
SILK settles.
DigitalMe identifies.
BMP sells.
Synnergyze assures.
```

## Backstage Implementation Rule

The current Backstage catalog should first use standard entity kinds:

- Domain,
- System,
- Component,
- Resource,
- API,
- Location.

Custom entities such as ClientAccount, WalletLedger, ClientSuccessPnl, GuaranteeRecord, and CreatorContribution should be introduced later through a dedicated plugin and catalog model extension.

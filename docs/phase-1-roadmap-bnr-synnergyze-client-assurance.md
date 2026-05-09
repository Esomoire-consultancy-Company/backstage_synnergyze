# Phase 1 Roadmap — BNR Synnergyze Client Assurance Cockpit

## Objective

Turn this Backstage fork into the **Synnergyze Client Assurance Cockpit**: a per-client commercial, service, evidence, wallet and governance control surface for BMP, Synnergyze, SILK, DigitalMe, Creators Common, Believers Common and BNR.

## Phase 1 Principle

Do not build custom plugin complexity first. First create the catalog, docs, config overlay and client success schema using standard Backstage primitives.

## Current scaffold

- `docs/bnr-synnergyze-client-success-operating-model.md`
- `catalog/bnr-synnergyze-commercial-catalog.yaml`
- `app-config.bnr.yaml`

## Core Success Formula

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

```text
Client Success Ratio = Client Net Benefit / Client Total Expense
```

## Phase 1 Build Checklist

### A. Backstage setup

- [ ] Run the app locally with `app-config.bnr.yaml` overlay.
- [ ] Confirm the BNR commercial catalog loads.
- [ ] Replace visible vanilla Backstage branding where safe.
- [ ] Add ESOMOIRE / Synnergyze ownership groups and users.

### B. BMP Revenue Master integration

- [ ] Define the BMP CRM source fields.
- [ ] Create the RevenueSource data contract.
- [ ] Map leads, orders, opportunities and revenue records into client success cards.
- [ ] Define revenue attribution rules: BMP source, partner source, creator source, referral source, direct source.

### C. Synnergyze service assurance

- [ ] Define service package schema.
- [ ] Define SLA levels.
- [ ] Define ticket status lifecycle.
- [ ] Define evidence requirements per service type.
- [ ] Map field team/service provider work to client P&L impact.

### D. SILK / DigitalMe wallet and card layer

- [ ] Define wallet ledger object.
- [ ] Define card object: service card, escrow card, contributor card, welfare card, settlement card.
- [ ] Define payout and refund status logic.
- [ ] Link wallet events to DigitalMe user/company identity.

### E. Client Success P&L dashboard

- [ ] Create client success card schema.
- [ ] Calculate gross revenue, total expense, net benefit and success ratio.
- [ ] Add evidence status.
- [ ] Add settlement status.
- [ ] Add tax MIS status.
- [ ] Add renewal recommendation.

### F. Creators Common / Believers Common split

- [ ] Define creator contribution record.
- [ ] Define Believers guarantee record.
- [ ] Define double-arm-distance rule.
- [ ] Define what asset belongs to Creators Common vs Believers Common.
- [ ] Define when an idea becomes a programme.

### G. Taxation MIS

- [ ] Split commercial MIS, settlement MIS, civic/community MIS and governance MIS.
- [ ] Add GST/TDS/TCS review placeholders.
- [ ] Add CA/legal validation status.
- [ ] Keep statutory taxes as pass-through/withholding, not operating margin.

### H. First pilot client

- [ ] Create one sample client account for AMD / AMD Apparels under the SCOTTS Program.
- [ ] Link BMP revenue source.
- [ ] Link Synnergyze service package.
- [ ] Link SILK wallet/card record.
- [ ] Link DigitalMe authority.
- [ ] Link BNR evidence and Warden status.

## Definition of Done for Phase 1

Phase 1 is complete when one pilot client can be opened in Backstage and the operator can see:

1. who the client is,
2. what revenue was sourced,
3. what service Synnergyze must assure,
4. what the client is paying,
5. what the client is gaining,
6. what evidence is pending,
7. what settlement is pending,
8. what tax/MIS status exists,
9. whether the client success ratio justifies renewal.

## GitHub Note

Issues are currently disabled in this repository. Until GitHub Issues or Projects are enabled, this roadmap file should function as the master implementation tracker.

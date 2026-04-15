# Crafted Companion — AI Project Instructions

## Overview

This skill provides guidelines for AI assistants working with NetSuite and Crafted ERP via the NetSuite AI Connector (MCP). It is a **superset of Oracle's `netsuite-ai-connector-instructions` skill** — includes all native NetSuite guidance plus Crafted ERP domain extensions. Install this one skill and you have both.

## Decision Tree: Which Path to Take

When the user's message arrives, route it through this tree:

```
Does the message start with [Crafted Prompt #ID ...]?
├─ YES → Crafted Companion path:
│         1. Call getPromptMeta(ID) immediately
│         2. Follow the returned steps/params/safety_rules
│         3. Call logExecution when done
│
└─ NO → Is the message about Crafted ERP data
        (barrels, lots, batches, compliance, MRP, recipe BOMs)?
        ├─ YES → Crafted domain path:
        │         1. Prefer Crafted Custom Tool Scripts
        │         2. Use searchItems to resolve names
        │         3. Apply edition awareness (Distillery/Winery/Brewery)
        │         4. Apply Crafted safety rules
        │
        └─ NO → Standard NetSuite path:
                  1. Reports → Saved Searches → Records → SuiteQL
                  2. Apply SuiteQL safety guardrails
                  3. Apply multi-subsidiary/currency rules
```

Both the Crafted and standard paths apply number formatting, hyperlink patterns, and artifact threshold rules.

---

# PART 1 — CRAFTED COMPANION (Crafted ERP Specific)

## Companion Prompt System

Every Crafted prompt begins with a header like:

```
[Crafted Prompt #103 — call getPromptMeta(103) first for orchestration context, safety rules, and tool chain]
```

When you see this header:

1. **Call `getPromptMeta`** with the ID shown (`getPromptMeta(promptId: 103)`)
2. Read the returned orchestration context: tool chain, steps, params, safety rules, governance level, edition notes, artifact flag
3. Follow the `steps` array in order, respecting `condition` and `depends_on` fields
4. Apply the `safety_rules` throughout execution
5. Request any missing `params` from the user before running tools
6. Generate an artifact if `artifact: true`
7. Call `logExecution` with the results when done

**This is mandatory for Crafted prompts** — the extension record contains orchestration details not in the prompt text itself.

### If the header is missing

If a prompt doesn't have the header but is about Crafted ERP domains, call `getPromptMeta` with the external ID pattern `aiprompt_crafted_*` or search by name. Extension records exist only for prompts in the Crafted namespace.

## Crafted Tool Selection Order

For Crafted ERP data, follow this priority:

1. **Crafted Custom Tool Scripts** (domain-specific, pre-built queries) — always prefer these
2. **searchItems** (front door for item identification) — resolve names to IDs before calling domain tools
3. **detectAccountConfig / getAccountConfig** (edition detection) — 33 probes
4. **Standard NetSuite tools** (fallback — see Part 2)

## Crafted Intelligence Domains

### Barrel Operations (barrel-intelligence — 8 tools)

| Tool | Purpose | Entry Point? |
|------|---------|:---:|
| `getBarrelProfile` | Single barrel identity, status, location, cooperage | Yes |
| `getBarrelActivityHistory` | Full event timeline for a barrel | No |
| `getBarrelCostTrace` | Cost history from acquisition through aging | No |
| `getBarrelKPIs` | Portfolio KPIs: inventory, activity, aging, angel's share | Yes |
| `getBarrelAging` | Aging distribution by item/location/cooper/woodtype | Yes |
| `getBarrelInventory` | Barrel counts by status/location/item/cooper/batch | Yes |
| `getBarrelValuation` | Financial value by serialnumber/item/location | Yes |
| `getBarrelLocationMap` | Warehouse/bin/rack distribution with movements | Yes |

**Orchestration:** Single barrel → `getBarrelProfile` first. Portfolio → `getBarrelKPIs` or `getBarrelAging/Inventory`. Financial → `getBarrelValuation` then `getBarrelCostTrace`.

### Lot Profitability (lot-profitability — 7 tools)

| Tool | Purpose | Entry Point? |
|------|---------|:---:|
| `getLotProfitability` | Summary P&L for a lot | Yes |
| `getLotCostTree` | Recursive backward cost trace (WO → components → PO) | No |
| `getLotSalesTrail` | Forward revenue trace (lot → shipment → invoice) | No |
| `getLotYieldAnalysis` | Manufacturing yield/OEE per operation | No |
| `getLotCostVariance` | Standard vs actual cost comparison | No |
| `getLotGLDetail` | GL-level transaction accounting lines | No |
| `getItemCostTrend` | Cost trend over time for an item | Yes |

**Orchestration:** Always start with `getLotProfitability` for summary. Drill into specifics based on what it reveals.

### Inventory & Supply Chain (inventory-supply — 9 tools)

| Tool | Purpose | Entry Point? |
|------|---------|:---:|
| `searchItems` | Resolve human names to item IDs | Yes |
| `getItemIntelligence` | Meta-orchestrator: position, aging, supply/demand, flags | Yes |
| `getInventorySnapshot` | Current stock by location with lot detail | No |
| `getInventoryAging` | Age distribution of inventory by lot | No |
| `getInventoryTrend` | Stock level trends over time | No |
| `getInventoryAlerts` | Low stock, expiring lots, negative on-hand | No |
| `getCostedBOM` | Bill of materials with full cost explosion | No |
| `getProductionCostVariance` | WO actual vs standard cost | No |
| `getSpotLightOccurrences` | Cross-reference item across all contexts | No |

**Orchestration:** `searchItems` → `getItemIntelligence` → deep dives based on flags.

### Compliance & Audit (compliance-audit — 8 tools)

Regulatory compliance readiness, TTB filing status, audit trails, field change audits, gain/loss analysis, accounting anomalies, data quality checks.

### MRP Intelligence (mrp-intelligence — 6 tools)

Shelf-life-aware MRP supply/demand, action messages, setup audits, shelf life MRP, supply plan analysis.

### Batch & Genealogy (batch-genealogy — 3 tools — Winery only)

Batch composition, lineage tracing, and genealogy analysis for blended products.

## Edition Awareness

Crafted ERP has three editions. Call `detectAccountConfig` if unsure which is active.

| Field/Concept | Distillery | Winery | Brewery |
|---------------|-----------|--------|---------|
| Volume unit | Proof Gallons (PG) | Gallons | Barrels/BBL |
| Barrel aging | Yes — angel's share, cost-per-PG | Yes — cost-per-gallon, no PG | No |
| Lot tracking | LOT costing, lot lineage | LOT costing, batch genealogy | LOT costing |
| Compliance | TTB reporting, DSP | TTB wine reporting | TTB beer reporting |
| BOM type | Standard + Recipe | Standard + Dynamic | Standard + Recipe |

- Use **proof gallons** and **cost-per-PG** for distillery accounts
- Use **gallons** and **cost-per-gallon** for winery accounts
- Don't reference proof gallons in a winery account or batch genealogy in a distillery account

## Governance Levels

| Level | AI Behavior |
|-------|-----------|
| **Minimal** | Execute directly. Format the result. No extra checks. |
| **Standard** | Follow tool chain. Apply edition logic. Generate artifact if flagged. |
| **Governed** | Validate params → detect edition → execute steps → apply safety rules → flag anomalies → format. |
| **Supervised** | Require user confirmation before each write. Log execution. Explain before doing. |

## Crafted Safety Rules (Global)

1. **Never fabricate data.** Values must come from tool responses.
2. **Never assume IDs.** Use `searchItems` to resolve names. Never hardcode internal IDs.
3. **Flag data quality issues** — zero-cost items, negative inventory, missing lot numbers.
4. **Respect edition boundaries.**
5. **Use the prompt's safety rules** from `getPromptMeta`.
6. **Log execution** via `logExecution` after completing or failing.

## Crafted Companion Tools

| Tool | Purpose |
|------|---------|
| `getPromptMeta` | Read orchestration metadata. Call FIRST for any Crafted prompt. |
| `seedPrompt` | Create Atlas prompt + extension record (admin use). |
| `updatePrompt` | Update prompt text and/or extension fields. |
| `logExecution` | Log execution: tools called, success/failure, duration. |
| `detectAccountConfig` | Detect active Crafted editions and features. |
| `getAccountConfig` | Read cached account configuration. |

## Crafted Example Workflow

User pastes the "Single Barrel Valuation" prompt:

```
[Crafted Prompt #201 — call getPromptMeta(201) first for orchestration context, safety rules, and tool chain]

What is barrel 092425-02 worth? Show me: current value, cost per unit, cost per proof gallon, fill date, current age, status, and location. Then trace how the value was built...
```

Flow:

1. **See header** → `getPromptMeta(promptId: 201)`
2. Read: `governance="Standard"`, `steps=[getBarrelProfile, getBarrelValuation, getBarrelCostTrace]`, `params={BARREL NUMBER: {required: true}}`, `artifact=true`, `artifact_type="cost-waterfall"`
3. Extract "092425-02" from user message as BARREL NUMBER
4. Call `getBarrelProfile(serialNumber: "092425-02")`
5. Call `getBarrelValuation` (depends_on getBarrelProfile)
6. Call `getBarrelCostTrace` (depends_on getBarrelProfile)
7. Apply safety rules: verify values, flag zero-cost entries
8. Generate cost-waterfall artifact with Crafted branding (teal #0785A8, amber #DB8A06)
9. `logExecution(promptId: 201, success: true, toolsCalled: [...], duration: N, agent: "claude")`

---

# PART 2 — STANDARD NETSUITE (Native AI Connector)

This section applies when the user's query is NOT about Crafted ERP data. Also applies as fallback within Crafted prompts when domain tools don't cover a specific need.

## Standard Tool Selection Order

**Always follow this priority — do not skip levels:**

1. **Reports** (if user mentions "dashboard", "compare", "trend", or "report")
   - NetSuite native reports first — fastest, pre-aggregated, pre-authorized
2. **Saved Searches** (if user asks about specific records, filters, or named data sets)
3. **Records** (if user asks about a specific transaction or entity)
4. **SuiteQL** (last resort for complex multi-record queries)

## Number Formatting Rules

| Range | Format | Example |
|-------|--------|---------|
| Millions | $X.XM | $2.1M (not $2,100,000) |
| Hundreds of thousands | $XXX.XK | $342.5K (not $342,500) |
| Percentages | XX.X% | 12.3% (not 0.123) |
| Large whole numbers | X,XXX | 1,250 (with commas) |

## Hyperlink Patterns

Create hyperlinks for transaction and entity references using these exact URL patterns:

**Transaction Records:**
- Invoice: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/custinvc.nl?id=[ID]`
- Sales Order: `https://[ACCOUNT].app.netsuite.com/app/order/salesorder.nl?id=[ID]`
- Purchase Order: `https://[ACCOUNT].app.netsuite.com/app/order/purchaseorder.nl?id=[ID]`
- Vendor Bill: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/vendorbill.nl?id=[ID]`
- Payment: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/payment.nl?id=[ID]`
- Journal Entry: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/journal.nl?id=[ID]`
- Credit Memo: `https://[ACCOUNT].app.netsuite.com/app/accounting/transactions/creditmemo.nl?id=[ID]`

**Entity Records:**
- Customer: `https://[ACCOUNT].app.netsuite.com/app/common/entity/custvendtype.nl?id=[ID]`
- Vendor: `https://[ACCOUNT].app.netsuite.com/app/common/entity/custvendtype.nl?id=[ID]`
- Employee: `https://[ACCOUNT].app.netsuite.com/app/common/entity/employee.nl?id=[ID]`

Replace `[ACCOUNT]` with account subdomain, `[ID]` with internal ID.

## Artifact Threshold Rules

Create interactive artifacts (dashboards/reports) when:
- **3+ KPIs** are shown (current value + trend)
- **10+ data rows** displayed
- User requests "dashboard", "report", or "compare"

**Do not** create artifacts for simple text, single metrics, or lists under 10 items.

## Design Tokens

**For non-Crafted artifacts — use Oracle Redwood:**

| Token | Color | Usage |
|-------|-------|-------|
| Ocean 160 | #003764 | Primary headers, key metrics |
| Ocean 120 | #36677D | Links, secondary headers |
| Coral 100 | #D64700 | Alerts, negative values |
| Moss 100 | #3D7A41 | Positive values, success |
| Amber 100 | #B95C00 | Warnings, attention needed |

**For Crafted artifacts — use Crafted Intelligence:**

| Token | Color | Usage |
|-------|-------|-------|
| Primary | #0785A8 | Teal — headers, key metrics |
| Accent | #DB8A06 | Amber — highlights, borders |
| Success | #84B75C | Positive values |
| Danger | #A83137 | Negative values |
| Fonts | Bebas Neue (headings), Lato (body) | |

## Record Type Hierarchy

**Sales & AR:** Sales Order → Item Fulfillment → Invoice → Customer Payment
**Purchasing & AP:** Purchase Order → Item Receipt → Vendor Bill → Vendor Payment
**Finance:** Journal Entry, Bank Reconciliation
**Inventory:** Inventory Adjustment, Transfer Order, Item Receipt, Item Fulfillment

## GL & Accounting Logic

| Account Type | Normal Balance | Debit Effect | Credit Effect |
|--------------|----------------|--------------|---------------|
| Asset | Debit | Increase | Decrease |
| Liability | Credit | Decrease | Increase |
| Equity | Credit | Decrease | Increase |
| Revenue | Credit | Decrease | Increase |
| Expense | Debit | Increase | Decrease |
| COGS | Debit | Increase | Decrease |

## Key SuiteQL Field Names

- `trandate` — transaction date
- `tranid` — document number
- `amount` — transaction amount (home currency)
- `foreignamount` — transaction amount (original currency)
- `exchangerate` — conversion rate applied
- `recordtype` — transaction type
- `approvalstatus` — approval workflow state
- `posting` — GL posting flag (T/F)
- `subsidiary`, `account`, `entity` — context fields
- `department`, `class`, `location` — segment fields

## Multi-Subsidiary & Currency Rules

- Always include `subsidiary` filter in multi-subsidiary accounts
- Report separately by subsidiary unless user requests consolidated view
- Include subsidiary name in output headers
- Always show both home currency and original currency for transactions
- Clearly label currency codes (USD, EUR, GBP, etc.)
- Do not mix currencies in aggregations without conversion

## SuiteQL Safety Guardrails

Every SuiteQL query MUST include:
- `ROWNUM <= 1000` (prevent runaway queries)
- `NVL(field, 0)` for nullable numeric fields
- `posting = 'T'` for GL transactions (exclude drafts)
- `approvalstatus = 2` for approved transactions
- `subsidiary = [ID]` filter in multi-subsidiary accounts

**Safe Query Template:**

```sql
SELECT
  id,
  NVL(amount, 0) AS amount,
  trandate,
  entity
FROM transaction
WHERE posting = 'T'
  AND approvalstatus = 2
  AND subsidiary = 1
  AND trandate >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
  AND ROWNUM <= 1000
ORDER BY trandate DESC
```

**Common Mistakes:**

| Mistake | Problem | Fix |
|---------|---------|-----|
| `SELECT *` | Slow, unnecessary columns | Name specific fields |
| Missing `ROWNUM` | Query timeout | Add `AND ROWNUM <= 1000` |
| `amount` without NVL | NULL errors in math | Wrap: `NVL(amount, 0)` |
| No `posting = 'T'` | Includes drafts | Filter drafts out |
| String concatenation | SQL injection risk | Use `?` placeholders |
| `LIKE '%pattern%'` | Slow full-text scan | Use exact match if possible |

## Error Recovery

When a query fails:

1. **SuiteQL syntax error** → Fall back to Saved Searches
2. **Permission denied** → Check role permissions, suggest Reports
3. **Timeout/ROWNUM hit** → Narrow date range or add filters
4. **NULL/empty result** → Verify data exists in target period
5. **Multi-subsidiary confusion** → Ask user which subsidiary to focus on

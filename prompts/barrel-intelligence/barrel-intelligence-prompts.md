# Barrel Intelligence — AI Companion Prompts

Crafted ERP | Domain: Barrel Management
Version: 1.0 | Edition: Cross-edition (Distillery + Winery)

---

## About This Document

This document defines AI Companion Prompts for the **Barrel Intelligence** domain of Crafted ERP. Each prompt is designed to be installed into NetSuite Prompt Studio (Setup > Company > AI > Prompt Studio) as a custom companion prompt, giving users a click-to-run starting point for barrel operations questions through the AI Connector Service.

### Tool Dependencies

All prompts in this domain depend on the `barrel-intelligence` toolset (package: `CraftedBarrelIntelligence`). The following 8 tools must be deployed and connected:

| Tool | Toolset | Query Strategy |
|------|---------|----------------|
| getBarrelProfile | dz_brlprofile | SuiteQL |
| getBarrelActivityHistory | dz_brlactivity | SuiteQL |
| getBarrelAging | dz_brlaging | SuiteQL |
| getBarrelInventory | dz_brlinventory | SuiteQL |
| getBarrelKPIs | dz_brlkpis | SuiteQL |
| getBarrelLocationMap | dz_brllocation | SuiteQL |
| getBarrelValuation | dz_brlvaluation | N/search hybrid |
| getBarrelCostTrace | dz_brlcosttrace | N/search hybrid |

### Orchestration Pattern

The recommended tool invocation order for barrel queries:

```
1. getBarrelProfile         ← Entry point for single-barrel queries
2. getBarrelKPIs            ← Entry point for portfolio/dashboard queries
3. Deep dives based on question:
   ├── getBarrelAging           (age distribution analysis)
   ├── getBarrelInventory       (stock counts and grouping)
   ├── getBarrelLocationMap     (warehouse/bin/rack analysis)
   ├── getBarrelValuation       (financial value of inventory)
   ├── getBarrelCostTrace       (single barrel cost history)
   └── getBarrelActivityHistory (single barrel event timeline)
```

### Edition Awareness

All tools auto-detect whether the account is **Distillery** or **Winery** edition:

- **Distillery**: Returns proof gallons (PG), ABV, proof, angel's share analysis, cost-per-PG
- **Winery**: Returns volume-only metrics, barrel group data, no PG fields

Prompts below note where output differs by edition.

---

## Category: Barrel Lookup & Profile

**Business Process:** Barrel Operations
**Recommended Roles:** Warehouse Manager, Production Manager, Distiller, Cellar Master

### Prompt 1: Look Up a Barrel

**Name:** `Look Up a Barrel by Number`
**Description:** Retrieve the full profile for a specific barrel including identity, fill/harvest data, cooperage details, location, and activity summary.

**Prompt Text:**
```
Look up barrel [BARREL NUMBER] and give me its full profile.

Show me: current status, fill date, age, location (warehouse/bin/rack), cooperage details (cooper, wood type, toast level), and the item it's associated with.

If it's been harvested, include the harvest date, harvest volume, and angel's share loss.

Summarize recent activity (last 5 events) at the bottom.
```

**Tool Chain:** `getBarrelProfile`
**Parameters:** User provides barrel number or partial name.

---

### Prompt 2: Barrel Activity Timeline

**Name:** `Show Barrel Activity History`
**Description:** Display the complete event timeline for a barrel — fills, harvests, bin transfers, reclaims, and all other movements.

**Prompt Text:**
```
Show me the complete activity history for barrel [BARREL NUMBER].

List every event in chronological order with: date, activity type, associated transaction (with document number and link), and any location/bin changes.

If there are more than 20 events, summarize by activity type first, then show the full timeline.
```

**Tool Chain:** `getBarrelProfile` → `getBarrelActivityHistory`
**Parameters:** User provides barrel number. Optional: activity type filter, date range.

---

### Prompt 3: Barrel Cost Breakdown

**Name:** `Trace Barrel Costs`
**Description:** Trace the full cost history of a barrel from empty barrel purchase through fill, aging, and harvest. Shows every posting transaction and the running cost balance.

**Prompt Text:**
```
Trace the complete cost history for barrel [BARREL NUMBER].

Show me:
1. The empty barrel acquisition cost
2. Fill costs (liquid + barrel components)
3. Every posting transaction in chronological order with running cost balance
4. Current total value and cost per proof gallon (distillery) or cost per gallon (winery)

If the barrel has been harvested, include the angel's share analysis: original PG vs. harvest PG, loss percentage, and final cost per PG at harvest.
```

**Tool Chain:** `getBarrelProfile` → `getBarrelCostTrace`
**Parameters:** User provides barrel number.
**Edition Note:** Angel's share and cost-per-PG are distillery only. Winery shows cost-per-gallon.

---

## Category: Barrel Portfolio & Dashboard

**Business Process:** Barrel Operations, Executive Reporting
**Recommended Roles:** CFO, COO, Production Manager, Warehouse Manager

### Prompt 4: Barrel Operations Dashboard

**Name:** `Barrel KPI Dashboard`
**Description:** Generate a dashboard-level view of barrel operations with inventory metrics, period activity, aging distribution, angel's share analysis, and status breakdown.

**Prompt Text:**
```
Give me a barrel operations dashboard for the current year.

Include these KPI sections:
- Current inventory: total filled barrels, total volume, total proof gallons, average age
- Period activity: barrels filled vs. harvested this year, net change, fill-to-harvest ratio
- Angel's share: average loss percentage across harvested barrels (distillery only)
- Aging distribution: barrel counts in each age bucket (under 6 months through 4+ years)
- Status breakdown: how many barrels in each status (filled, empty, ready to harvest, etc.)

Present this as a dashboard with KPI cards at the top and detail tables below.
```

**Tool Chain:** `getBarrelKPIs` (with startDate = Jan 1 of current year)
**Parameters:** Optional: location filter, custom date range.
**Artifact Trigger:** Yes — 3+ KPIs, dashboard request.

---

### Prompt 5: Barrel Aging Report

**Name:** `Barrel Aging Distribution`
**Description:** Analyze barrel aging across the portfolio, grouped by item, location, cooper, wood type, or batch.

**Prompt Text:**
```
Show me a barrel aging report grouped by [ITEM / LOCATION / COOPER / WOOD TYPE].

For each group, show:
- Number of barrels
- Age distribution buckets (under 6 months, 6mo–1yr, 1–2yr, 2–3yr, 3–4yr, 4+ years)
- Average age in years
- Oldest and newest fill dates
- Total volume and proof gallons

Highlight any groups where the average age exceeds 4 years — these may be candidates for harvest review.
```

**Tool Chain:** `getBarrelAging` (with groupBy parameter)
**Parameters:** User selects groupBy dimension. Optional: location filter, status filter.
**Artifact Trigger:** Yes — typically 10+ data rows.

---

### Prompt 6: Barrel Inventory Snapshot

**Name:** `Barrel Inventory Count`
**Description:** Get a current count of all barrels grouped by status, location, item, cooperage, or batch.

**Prompt Text:**
```
How many barrels do we have right now? Break it down by [STATUS / LOCATION / ITEM / COOPER / BATCH].

For each group show: barrel count, total volume, total proof gallons.

Also show the overall status distribution (filled, empty, ready to harvest, etc.) as a summary at the top.
```

**Tool Chain:** `getBarrelInventory` (with groupBy parameter)
**Parameters:** User selects groupBy dimension. Optional: location, status, or item filters.

---

## Category: Barrel Valuation & Finance

**Business Process:** Financial Reporting, Inventory Valuation
**Recommended Roles:** CFO, Controller, Accountant, Production Manager

### Prompt 7: Barrel Portfolio Valuation

**Name:** `Barrel Inventory Valuation`
**Description:** Calculate the current financial value of barrel inventory using posting transaction cost data. Supports individual barrel, item-level, or location-level aggregation.

**Prompt Text:**
```
What is our barrel inventory worth? Show me the valuation grouped by [ITEM / LOCATION / INDIVIDUAL BARRELS].

For each group, include:
- Number of barrels
- Total value (from serialnumbercost on posting transactions)
- Average value per barrel
- Total proof gallons and value per proof gallon (distillery only)

Show a grand total at the top: total barrels, total portfolio value, average value per barrel, and overall value per proof gallon.
```

**Tool Chain:** `getBarrelValuation` (with groupBy parameter)
**Parameters:** User selects groupBy: 'serialnumber' (individual), 'item', or 'location'. Optional: serialNumber, itemId, locationId filters.
**Edition Note:** Value-per-PG is distillery only. Winery shows value-per-gallon.
**Artifact Trigger:** Yes — financial analysis with multiple metrics.

---

### Prompt 8: Single Barrel Valuation

**Name:** `Value a Specific Barrel`
**Description:** Get the current financial value of a single barrel with full cost context.

**Prompt Text:**
```
What is barrel [BARREL NUMBER] worth?

Show me: current value, cost per unit, cost per proof gallon, fill date, current age, status, and location.

Then trace how the value was built — show the cost waterfall from the cost trace tool: empty barrel cost, fill components, and any subsequent cost transactions.
```

**Tool Chain:** `getBarrelProfile` → `getBarrelValuation` (with serialNumber filter) → `getBarrelCostTrace`
**Parameters:** User provides barrel number.

---

## Category: Warehouse & Location

**Business Process:** Warehouse Management, Logistics
**Recommended Roles:** Warehouse Manager, Production Manager, Operations Director

### Prompt 9: Barrel Location Map

**Name:** `Where Are Our Barrels?`
**Description:** Analyze barrel distribution across warehouses, bins, and racks with status breakdown and recent movement activity.

**Prompt Text:**
```
Show me where all our barrels are located, grouped by [LOCATION / BIN / RACK].

For each group show:
- Total barrel count
- Breakdown by status: filled, empty, ready to harvest
- Total volume and proof gallons
- Average age
- Fill date range (oldest to newest)

Also show the 25 most recent barrel movements (transfers, putaways, receives) so I can see what's been moving.
```

**Tool Chain:** `getBarrelLocationMap` (with groupBy parameter)
**Parameters:** User selects groupBy dimension. Optional: location filter, status filter.
**Artifact Trigger:** Yes — typically 10+ rows with movement activity.

---

### Prompt 10: Barrel Movements Report

**Name:** `Recent Barrel Movements`
**Description:** Show recent barrel movement activity — bin transfers, putaways, and receives — to track warehouse logistics.

**Prompt Text:**
```
What barrel movements have happened recently?

Show the last [25/50/100] movements with: date, activity type, barrel number, destination location and bin, and the associated item.

Group by activity type so I can see how many transfers vs. putaways vs. receives we've had.
```

**Tool Chain:** `getBarrelLocationMap` (with maxMovements parameter)
**Parameters:** User specifies maxMovements count.

---

## Category: Harvest Planning

**Business Process:** Production Planning, Quality Management
**Recommended Roles:** Distiller, Cellar Master, Production Manager, Head Blender

### Prompt 11: Harvest-Ready Barrels

**Name:** `Which Barrels Are Ready to Harvest?`
**Description:** Identify all barrels in "Ready to Harvest" status with aging, location, and valuation context.

**Prompt Text:**
```
Which barrels are ready to harvest?

Show me all barrels in "Ready to Harvest" status (status 5), grouped by item. For each barrel include: barrel number, age, location, volume, proof gallons, and current value.

Then show the aggregate: total barrels ready, total volume, total PG, total value, and average age.

Highlight any barrels over 8 years old — these are the longest-aged candidates.
```

**Tool Chain:** `getBarrelInventory` (statusFilter: "5", groupBy: "item") → `getBarrelValuation` (with item-level aggregation)
**Parameters:** None required — preset to "Ready to Harvest" status.

---

### Prompt 12: Angel's Share Analysis

**Name:** `Angel's Share Loss Report`
**Description:** Analyze angel's share (evaporation loss) across harvested barrels to understand loss patterns by age, item, or location.

**Prompt Text:**
```
Give me an angel's share analysis for barrels harvested in [DATE RANGE or YEAR].

Show: total barrels harvested with PG data, original PG vs. harvest PG, total PG lost, and the average angel's share percentage.

Then break down angel's share by average harvest age to show the relationship between aging time and evaporation loss. Are older barrels losing a higher percentage?

Flag any barrels with angel's share above 15% — these are statistical outliers that may warrant investigation (leaking, cooperage issues, storage environment).
```

**Tool Chain:** `getBarrelKPIs` (with date range for period) → supplemental queries via individual `getBarrelCostTrace` for outlier investigation
**Parameters:** User provides date range.
**Edition Note:** Distillery only — angel's share requires proof gallon tracking.

---

## Category: Cooperage Analysis

**Business Process:** Barrel Procurement, Quality Management
**Recommended Roles:** Distiller, Production Manager, Procurement Manager

### Prompt 13: Cooperage Performance Comparison

**Name:** `Compare Barrel Coopers`
**Description:** Compare barrel inventory and aging metrics across different coopers (barrel manufacturers) to evaluate cooperage performance.

**Prompt Text:**
```
Compare our barrels by cooper (manufacturer).

For each cooper, show:
- Total barrel count
- Aging distribution (how many barrels in each age bucket)
- Average age
- Total volume and proof gallons

I want to understand: which coopers do we use most, and how does the age distribution differ across coopers?

If we have valuation data, also show total value and average value per barrel by cooper.
```

**Tool Chain:** `getBarrelAging` (groupBy: "cooper") → `getBarrelInventory` (groupBy: "cooper")
**Parameters:** None required — preset to cooper grouping.

---

### Prompt 14: Wood Type & Toast Analysis

**Name:** `Barrel Wood & Toast Breakdown`
**Description:** Analyze barrel inventory by wood type and toast level to understand the portfolio composition.

**Prompt Text:**
```
Break down our barrel inventory by wood type.

For each wood type show: barrel count, aging distribution, average age, volume, and proof gallons.

Then do the same breakdown by toast level.

I want to see our barrel portfolio composition — what wood types and toast levels dominate, and are there any with very few barrels that might need restocking?
```

**Tool Chain:** `getBarrelAging` (groupBy: "woodtype") → `getBarrelInventory` (groupBy: "cooper" — for toast data from cooperage details)
**Parameters:** None required.

---

## Prompt Studio Installation Notes

### How to Add These to Prompt Studio

1. Navigate to **Setup > Company > AI > Prompt Studio**
2. Click **New** to create a custom prompt
3. Fill in:
   - **Name**: Use the prompt name from above (e.g., "Look Up a Barrel by Number")
   - **Description**: Use the description provided
   - **Category / Business Process**: Use the category noted (e.g., "Barrel Operations")
   - **Recommended Roles**: Assign the roles listed for each prompt
   - **Prompt Body**: Paste the prompt text, replacing [BRACKETS] with parameter placeholders
4. Click **Save**
5. Test with **Generate Preview** to verify tool routing

### Parameter Handling

Prompts with `[BRACKETS]` indicate user-supplied parameters. In Prompt Studio, these become fill-in fields that users complete before running the prompt. For example:

- `[BARREL NUMBER]` → User types a barrel name like "092425-02"
- `[ITEM / LOCATION / COOPER / WOOD TYPE]` → User selects from a dropdown
- `[DATE RANGE or YEAR]` → User enters a period like "01/01/2025 to 12/31/2025"

### Prerequisites

Before these prompts will work:

1. **MCP Standard Tools SuiteApp** installed and updated to latest version
2. **Barrel Intelligence toolset** deployed via SDF (`packages/barrel-intelligence`)
3. **MCP connector reconnected** after deploying barrel tools (tool cache refresh)
4. **Crafted ERP** installed with barrel management enabled
5. **User role** has MCP Server Connection permission + access to barrel data

---

## Mapping to Existing Playbooks

These companion prompts are **lightweight, single-purpose entry points** — not full governed playbooks. They map to the Crafted Intelligence architecture as follows:

| Layer | What It Is | Where It Lives |
|-------|-----------|----------------|
| **Companion Prompts** (this doc) | Click-to-run questions for Prompt Studio | NetSuite Prompt Studio |
| **Intelligence Playbooks** | Full 13-section governed analysis workflows | Prompt Engine (customrecord_dz_ap) |
| **Custom Tool Scripts** | Server-side SuiteScript tools | SDF packages (barrel-intelligence) |

Companion prompts are the **front door** for users who don't know what to ask. Playbooks are the **deep analysis engine** for complex, multi-step investigations. Both call the same underlying Custom Tool Scripts.

### Future: Barrel Intelligence Playbook

A full governed playbook for barrel intelligence (similar to the SpotLight Triage playbook) could orchestrate all 8 barrel tools in a systematic investigation flow:

1. Portfolio KPIs → flag anomalies
2. Aging distribution → identify harvest candidates
3. Valuation → assess financial exposure
4. Location analysis → optimize warehouse utilization
5. Deep dives on flagged barrels → cost trace, activity timeline

This would be created via `createPlaybook` in the Prompt Engine and stored as a modular-section playbook in NetSuite.

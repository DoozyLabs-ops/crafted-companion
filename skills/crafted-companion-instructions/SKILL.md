# Crafted Companion — AI Project Instructions

## Overview

This skill provides guidelines for AI assistants working with **Crafted ERP** data via the NetSuite AI Connector (MCP). It layers on top of Oracle's `netsuite-ai-connector-instructions` — Oracle's skill handles generic NetSuite behavior, this skill handles Crafted-specific domains, tool chains, and orchestration.

Use these instructions when the user's question involves barrel operations, lot profitability, inventory intelligence, compliance auditing, MRP planning, or batch genealogy — the domains covered by Crafted ERP.

## Companion Prompt System

Crafted Intelligence uses a **companion prompt system** with orchestration metadata stored in extension records. Every Crafted prompt begins with a header like:

```
[Crafted Prompt #103 — call getPromptMeta(103) first for orchestration context, safety rules, and tool chain]
```

When you see this header:

1. **Call `getPromptMeta`** with the ID shown in the header (e.g., `getPromptMeta(promptId: 103)`)
2. Read the returned orchestration context: tool chain, steps, params, safety rules, governance level, edition notes, artifact flag
3. Follow the `steps` array in order, respecting `condition` and `depends_on` fields
4. Apply the `safety_rules` throughout execution
5. Request any missing `params` from the user before running tools
6. Generate an artifact if `artifact: true`
7. Call `logExecution` with the results when done

**This is the mandatory first step for every Crafted prompt execution.** Do not skip it — the extension record contains orchestration details (conditional steps, tool dependencies, edition-specific behavior) that are not in the prompt text itself.

### If the header is missing

If a prompt doesn't have the `[Crafted Prompt #ID ...]` header but appears to be about Crafted ERP data (barrels, lots, batches, compliance, MRP), you can still call `getPromptMeta` with the external ID pattern `aiprompt_crafted_*` or search by name. Extension records are only available for prompts with IDs in the Crafted namespace.

## Crafted Tool Selection Order

When a user asks about Crafted ERP data, follow this tool selection priority:

1. **Crafted Custom Tool Scripts** (domain-specific, pre-built queries)
   - Always prefer these over generic SuiteQL for Crafted data
   - Each domain has dedicated tools optimized for its queries
   - Tools handle edition detection, governance, and formatting

2. **searchItems** (front door for item identification)
   - Resolve human names to internal IDs before calling domain tools
   - Supports fuzzy matching on item names

3. **detectAccountConfig / getAccountConfig** (edition detection)
   - Call when you need to know which Crafted editions are active
   - Returns 33 probes: editions, features, compliance modules

4. **Standard NetSuite tools** (Reports, Saved Searches, Records, SuiteQL)
   - Use Oracle's tool selection order for non-Crafted queries
   - Fall back to SuiteQL only when Crafted tools don't cover the need

## Crafted Intelligence Domains

### Barrel Operations
**Toolset:** barrel-intelligence (8 tools)

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

**Orchestration pattern:**
- Single barrel queries: `getBarrelProfile` first, then deep dives
- Portfolio queries: `getBarrelKPIs` or `getBarrelAging`/`getBarrelInventory` first
- Financial queries: `getBarrelValuation`, then `getBarrelCostTrace` for detail

### Lot Profitability
**Toolset:** lot-profitability (7 tools)

| Tool | Purpose | Entry Point? |
|------|---------|:---:|
| `getLotProfitability` | Summary P&L for a lot (COGS, revenue, margin) | Yes |
| `getLotCostTree` | Recursive backward cost trace (WO → components → PO) | No |
| `getLotSalesTrail` | Forward revenue trace (lot → shipment → invoice) | No |
| `getLotYieldAnalysis` | Manufacturing yield/OEE per operation | No |
| `getLotCostVariance` | Standard vs actual cost comparison | No |
| `getLotGLDetail` | GL-level transaction accounting lines | No |
| `getItemCostTrend` | Cost trend over time for an item | Yes |

**Orchestration pattern:**
- Always start with `getLotProfitability` for the summary
- Drill into specific tools based on what the summary reveals

### Inventory & Supply Chain
**Toolset:** inventory-supply (9 tools)

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

**Orchestration pattern:**
- `searchItems` → `getItemIntelligence` → deep dives based on flags

### Compliance & Audit
**Toolset:** compliance-audit (8 tools)

Covers regulatory compliance readiness, filing status, audit trails, field change audits, and data quality checks.

### MRP Intelligence
**Toolset:** mrp-intelligence (6 tools)

Covers MRP supply/demand analysis, action messages, setup audits, shelf life MRP, and supply plan analysis.

### Batch & Genealogy (Winery)
**Toolset:** batch-genealogy (3 tools)

Covers batch composition, lineage tracing, and genealogy analysis for blended products. Winery edition only.

## Edition Awareness

Crafted ERP has three editions. Tools auto-detect the active edition, but output differs:

| Field/Concept | Distillery | Winery | Brewery |
|---------------|-----------|--------|---------|
| Volume unit | Proof Gallons (PG) | Gallons | Barrels/BBL |
| Barrel aging | Yes — angel's share, cost-per-PG | Yes — cost-per-gallon, no PG | No |
| Lot tracking | LOT costing, lot lineage | LOT costing, batch genealogy | LOT costing |
| Compliance | TTB reporting, DSP | TTB wine reporting | TTB beer reporting |
| BOM type | Standard + Recipe | Standard + Dynamic | Standard + Recipe |

When generating output:
- Use **proof gallons** and **cost-per-PG** for distillery accounts
- Use **gallons** and **cost-per-gallon** for winery accounts
- Call `detectAccountConfig` if unsure which edition is active

## Governance Levels

Each Crafted prompt has a governance level that controls your behavior:

| Level | What to Do |
|-------|-----------|
| **Minimal** | Execute the tool directly. Format the result. No extra checks needed. |
| **Standard** | Follow the tool chain. Apply edition-specific logic. Generate artifact if flagged. |
| **Governed** | Full orchestration: validate params → detect edition → execute steps → apply safety rules → flag anomalies → format output. |
| **Supervised** | Require user confirmation before each write operation. Log execution. Explain what you're about to do before doing it. |

## Safety Rules (Global)

These apply to ALL Crafted prompt executions:

1. **Never fabricate data.** All values must come from tool responses. If a tool returns no data, say so.
2. **Never assume IDs.** Use `searchItems` to resolve names to IDs. Never hardcode internal IDs.
3. **Flag data quality issues.** Zero-cost items, negative inventory, missing lot numbers — call them out.
4. **Respect edition boundaries.** Don't reference proof gallons in a winery account or batch genealogy in a distillery account.
5. **Use the prompt's safety rules.** Each prompt's `getPromptMeta` response includes specific safety rules. Follow them.
6. **Log execution.** Call `logExecution` after completing or failing a prompt run.

## Artifact Guidelines

Create visual artifacts (HTML dashboards, charts, tables) when:
- The prompt's `artifact` flag is `true`
- 3+ KPIs are shown
- 10+ data rows are displayed
- User requests "dashboard", "report", or "compare"

Use Crafted Intelligence branding:
- Primary: `#0785A8` (teal) — headers, key metrics
- Accent: `#DB8A06` (amber) — highlights, borders
- Success: `#84B75C` — positive values
- Danger: `#A83137` — negative values, alerts
- Headings font: Bebas Neue
- Body font: Lato

## Companion Tools

| Tool | Purpose |
|------|---------|
| `getPromptMeta` | Read orchestration metadata for a prompt. Call this FIRST. |
| `seedPrompt` | Create a new Atlas prompt + extension record (admin use). |
| `updatePrompt` | Update prompt text and/or extension metadata (admin use). |
| `logExecution` | Log a prompt execution: tools called, success/failure, duration. |
| `detectAccountConfig` | Detect which Crafted editions and features are active. |
| `getAccountConfig` | Read cached account configuration. |

## Example Workflow

User pastes the "Single Barrel Valuation" prompt into Claude:

```
[Crafted Prompt #201 — call getPromptMeta(201) first for orchestration context, safety rules, and tool chain]

What is barrel 092425-02 worth? Show me: current value, cost per unit, cost per proof gallon, fill date, current age, status, and location. Then trace how the value was built...
```

Steps:

1. **See the header** → immediately call `getPromptMeta(promptId: 201)`
2. Read the response:
   - `governance: "Standard"` → follow tool chain with edition logic
   - `steps: [getBarrelProfile, getBarrelValuation, getBarrelCostTrace]`
   - `params: { BARREL NUMBER: { required: true, hint: "e.g. 092425-02" } }`
   - `safety_rules: [...]`, `artifact: true`, `artifact_type: "cost-waterfall"`
3. Extract "092425-02" from the user's message as the BARREL NUMBER param
4. Call `getBarrelProfile` with serialNumber="092425-02"
5. Call `getBarrelValuation` with serialNumber filter (depends_on getBarrelProfile)
6. Call `getBarrelCostTrace` for the cost waterfall (depends_on getBarrelProfile)
7. Apply safety rules: verify all values came from tools, flag zero-cost entries
8. Generate a cost-waterfall artifact with Crafted branding
9. Call `logExecution(promptId=201, success=true, toolsCalled=[...], duration=N, agent="claude")`

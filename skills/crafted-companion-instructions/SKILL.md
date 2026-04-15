# Crafted Companion — AI Project Instructions

## Overview

This skill provides guidelines for AI assistants working with **Crafted ERP** data via the NetSuite AI Connector (MCP). It layers on top of Oracle's `netsuite-ai-connector-instructions` — Oracle's skill handles generic NetSuite behavior, this skill handles Crafted-specific domains, tool chains, and orchestration.

Use these instructions when the user's question involves barrel operations, lot profitability, inventory intelligence, compliance auditing, MRP planning, or batch genealogy — the domains covered by Crafted ERP.

## Companion Prompt System

Crafted Intelligence uses a **companion prompt system** with orchestration metadata stored in extension records. Before executing any Crafted prompt:

1. **Call `getPromptMeta`** with the prompt ID or external ID
2. Read the returned orchestration context: tool chain, steps, params, safety rules, governance level
3. Follow the steps in order, respecting conditions and dependencies
4. Apply safety rules throughout execution
5. Generate an artifact if `artifact: true`
6. Call `logExecution` when done

This is the standard first step for every Crafted prompt execution.

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

User asks: "What is barrel 092425-02 worth?"

1. Recognize this is a Crafted barrel query → use barrel-intelligence tools
2. Call `getPromptMeta` for the "Single Barrel Valuation" prompt (ID 201 or external ID `aiprompt_crafted_barrel_008`)
3. Read the response: governance=Standard, steps=[getBarrelProfile, getBarrelValuation, getBarrelCostTrace], artifact=true
4. Call `getBarrelProfile` with serialNumber="092425-02"
5. Call `getBarrelValuation` with serialNumber filter
6. Call `getBarrelCostTrace` for the cost waterfall
7. Generate a cost-waterfall artifact with Crafted branding
8. Apply safety rules: verify all values came from tools, flag any zero-cost entries
9. Call `logExecution` with promptId=201, success=true, toolsCalled, duration

# Companion Prompt Extension — Design Specification

Doozy Solutions | Crafted Intelligence
Version: 1.0 | Date: 2026-04-14

---

## Problem Statement

Oracle's AI Companion SuiteApp (`atlas_aicomp`) provides a prompt library with 20 fields per record, but the record type is **fully bundle-locked** — no custom fields can be added. The existing fields cover generic prompt metadata (name, text, category, roles, industry, usage counters) but lack the domain-specific context Crafted Intelligence needs:

- Which Custom Tool Scripts does the prompt depend on?
- What orchestration pattern should the AI follow?
- Which Crafted ERP edition(s) does it apply to?
- Does it link to a governed playbook for deeper analysis?
- What parameters does the user need to provide?
- Should it trigger an artifact (dashboard/chart)?

Without this metadata, companion prompts are just text blobs — the AI gets no guidance on tool selection, sequencing, or edition-aware behavior.

---

## Solution: Two-Layer Extension

### Layer 1: Extension Record (`customrecord_dz_prompt_meta`)

A Crafted-owned custom record type that links to the Atlas companion prompt by internal ID. Stores all queryable metadata for filtering, dashboards, and programmatic access.

### Layer 2: Embedded Meta Block

A structured comment block prepended to the companion prompt text body. Gives the AI runtime context without needing an extra tool call. Parsed by the AI at execution time.

Together, these layers give us full extensibility without modifying Oracle's bundle.

---

## Layer 1: Extension Record Schema

### Record Type: `customrecord_dz_prompt_meta`

**Display Name:** Crafted Prompt Metadata
**SDF Package:** `prompt-engine` (deploy alongside existing playbook records)
**AI Description:** Extension metadata for AI Companion Prompts. Links a Crafted Intelligence prompt to its tool dependencies, orchestration pattern, edition compatibility, playbook reference, and parameter schema. Query this record alongside customrecord_atlas_aicomp_prompts to get full Crafted context for any companion prompt.

### Fields

| # | Script ID | Label | Type | Required | AI Description |
|---|-----------|-------|------|----------|---------------|
| 1 | `custrecord_dz_pm_prompt_ref` | Companion Prompt | INTEGER | Yes | Internal ID of the linked `customrecord_atlas_aicomp_prompts` record. Foreign key — not a native NS reference because the Atlas record type is bundle-locked and may not support standard record references from outside the bundle. |
| 2 | `custrecord_dz_pm_prompt_extid` | Prompt External ID | TEXT | No | External ID of the linked companion prompt (e.g., `aiprompt_crafted_barrel_001`). Redundant with prompt_ref but allows matching by external ID pattern for batch operations. |
| 3 | `custrecord_dz_pm_domain` | Domain | LIST → `customlist_dz_ap_domain` | Yes | Reuses the existing Prompt Engine domain list. Values: Cost Analysis (1), Inventory (2), Production (3), Compliance (4), General (5). New values to add: Barrel Operations (6), Supply Chain (7), Quality (8). |
| 4 | `custrecord_dz_pm_subdomain` | Subdomain | TEXT | No | Finer classification within domain. Examples: "Barrel Lookup & Profile", "Barrel Valuation & Finance", "Harvest Planning", "Cooperage Analysis". Free text for flexibility. |
| 5 | `custrecord_dz_pm_toolset` | Toolset | TEXT | Yes | SDF package name from toolset-registry.yaml. Examples: `barrel-intelligence`, `lot-profitability`, `inventory-supply`, `compliance-audit`. Used to validate tool availability before prompt execution. |
| 6 | `custrecord_dz_pm_tool_chain` | Tool Chain | TEXT (long) | Yes | Ordered tool invocation sequence. Format: tool names separated by ` → ` for sequential, ` + ` for parallel. Examples: `getBarrelProfile → getBarrelCostTrace`, `getBarrelKPIs`, `getBarrelAging + getBarrelInventory`. |
| 7 | `custrecord_dz_pm_tool_deps` | Tool Dependencies | TEXT (long) | No | JSON array of all tool function names this prompt may invoke. Example: `["getBarrelProfile", "getBarrelActivityHistory", "getBarrelCostTrace"]`. Used for dependency validation — if any tool is missing from the MCP connector, the prompt should warn the user. |
| 8 | `custrecord_dz_pm_edition` | Edition Compatibility | LIST → `customlist_dz_pm_edition` | Yes | New custom list. Values: Distillery (1), Winery (2), Brewery (3), Cross-Edition (4), Non-Alcoholic (5), Any (6). Determines whether the prompt is shown/applicable for the current account's edition. |
| 9 | `custrecord_dz_pm_edition_notes` | Edition Notes | TEXT | No | How output differs by edition. Example: "Distillery: includes proof gallons, ABV, angel's share. Winery: volume-only, no PG fields." Included in the AI's context for edition-aware output. |
| 10 | `custrecord_dz_pm_entry_tool` | Entry Point Tool | TEXT | No | The first tool to call. Examples: `getBarrelProfile` for single-barrel queries, `getBarrelKPIs` for portfolio queries. Helps the AI know where to start without parsing the full tool chain. |
| 11 | `custrecord_dz_pm_params` | Parameter Schema | TEXT (long) | No | JSON object defining the `[PLACEHOLDER]` parameters in the prompt text. Example: `{"BARREL NUMBER": {"type": "text", "description": "Barrel name or partial match", "required": true}, "DATE RANGE": {"type": "dateRange", "required": false}}`. Used by Prompt Studio UI for parameter input and by AI for validation. |
| 12 | `custrecord_dz_pm_artifact` | Artifact Trigger | CHECKBOX | No | Whether this prompt should generate a React artifact (dashboard, chart, table). Default: F. When true, the AI should create a visual artifact using Oracle Redwood tokens rather than inline text. |
| 13 | `custrecord_dz_pm_artifact_type` | Artifact Type | TEXT | No | Hint for what kind of artifact to generate. Values: "dashboard", "table", "chart", "timeline", "cost-waterfall", "aging-heatmap". Free text — the AI interprets this as a design direction. |
| 14 | `custrecord_dz_pm_playbook_ref` | Playbook Reference | INTEGER | No | Internal ID of a `customrecord_dz_analysis_prompt` (Prompt Engine playbook). When set, the companion prompt is a lightweight entry point to a full governed playbook. The AI can offer to "go deeper" by loading the playbook. |
| 15 | `custrecord_dz_pm_complexity` | Complexity | LIST → `customlist_dz_pm_complexity` | No | New custom list. Values: Simple (1) — single tool call; Standard (2) — 2-3 tool chain; Complex (3) — 4+ tools or conditional logic; Playbook (4) — requires full playbook execution. Helps the AI set user expectations on response time. |
| 16 | `custrecord_dz_pm_version` | Version | TEXT | No | Semver version of this prompt metadata. Example: "1.0.0". Incremented when prompt text, tool chain, or parameters change. |
| 17 | `custrecord_dz_pm_author` | Author | TEXT | No | Who created this prompt metadata. Example: "Doozy Solutions", "Client Custom". |
| 18 | `custrecord_dz_pm_status` | Status | LIST → `customlist_dz_pm_status` | No | New custom list. Values: Active (1), Draft (2), Deprecated (3), Testing (4). Allows prompts to be staged before activation. |

### New Custom Lists

#### `customlist_dz_pm_edition` — Edition Compatibility
| ID | Value |
|----|-------|
| 1 | Distillery |
| 2 | Winery |
| 3 | Brewery |
| 4 | Cross-Edition |
| 5 | Non-Alcoholic |
| 6 | Any |

#### `customlist_dz_pm_complexity` — Prompt Complexity
| ID | Value |
|----|-------|
| 1 | Simple |
| 2 | Standard |
| 3 | Complex |
| 4 | Playbook |

#### `customlist_dz_pm_status` — Prompt Metadata Status
| ID | Value |
|----|-------|
| 1 | Active |
| 2 | Draft |
| 3 | Deprecated |
| 4 | Testing |

### Extended Domain List Values

Add to existing `customlist_dz_ap_domain`:

| ID | Value | New? |
|----|-------|------|
| 1 | Cost Analysis | Existing |
| 2 | Inventory | Existing |
| 3 | Production | Existing |
| 4 | Compliance | Existing |
| 5 | General | Existing |
| 6 | Barrel Operations | **New** |
| 7 | Supply Chain | **New** |
| 8 | Quality | **New** |

---

## Layer 2: Embedded Meta Block Format

Prepended to the companion prompt text body as an HTML comment. Invisible to the user in Prompt Studio UI but parsed by the AI at runtime.

### Format

```
<!-- crafted-intelligence
domain: Barrel Operations
toolset: barrel-intelligence
toolchain: getBarrelProfile → getBarrelCostTrace
entry: getBarrelProfile
edition: cross
artifact: true
artifact_type: cost-waterfall
complexity: standard
playbook: null
params:
  BARREL NUMBER:
    type: text
    required: true
    hint: Enter barrel name like "092425-02"
-->

[Actual prompt text starts here...]
```

### Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `domain` | Yes | Matches `customlist_dz_ap_domain` value name |
| `toolset` | Yes | SDF package name from toolset-registry.yaml |
| `toolchain` | Yes | Tool invocation sequence (` → ` for sequential, ` + ` for parallel) |
| `entry` | No | First tool to call |
| `edition` | Yes | `distillery`, `winery`, `brewery`, `cross`, `any` |
| `artifact` | No | `true` or `false` — whether to generate a visual artifact |
| `artifact_type` | No | Design hint: `dashboard`, `table`, `chart`, `timeline`, `cost-waterfall` |
| `complexity` | No | `simple`, `standard`, `complex`, `playbook` |
| `playbook` | No | Internal ID of linked playbook, or `null` |
| `params` | No | YAML-formatted parameter definitions matching `[BRACKETS]` in prompt text |

### Parsing Rules for AI

1. Check if prompt text starts with `<!-- crafted-intelligence`
2. Extract the YAML block between the opening and closing `-->` tags
3. Parse as YAML to get structured metadata
4. Use `toolchain` to determine tool invocation order
5. Use `edition` to filter output fields (e.g., skip proof gallons for winery)
6. Use `artifact` + `artifact_type` to decide whether to create a React artifact
7. Use `params` to validate user-provided parameters before calling tools
8. If `playbook` is set, offer the user to "go deeper with the full analysis playbook"

---

## How the Two Layers Work Together

```
┌──────────────────────────────────────────────────────────────┐
│                   USER OPENS PROMPT STUDIO                    │
│                                                              │
│  1. Suitelet queries customrecord_atlas_aicomp_prompts       │
│     (Oracle's bundle — prompt text, category, roles)         │
│                                                              │
│  2. JOIN to customrecord_dz_prompt_meta via prompt_ref       │
│     (Crafted extension — toolset, edition, complexity)       │
│                                                              │
│  3. Filter by edition compatibility:                         │
│     IF account edition = Distillery AND prompt edition       │
│     IN ('Distillery', 'Cross-Edition', 'Any') → show        │
│                                                              │
│  4. User clicks prompt → AI receives prompt text             │
│     with embedded meta block                                 │
│                                                              │
│  5. AI parses meta block → knows tool chain, edition,        │
│     artifact hints, parameter requirements                   │
│                                                              │
│  6. AI executes tools in order → formats output              │
│     → generates artifact if flagged                          │
│                                                              │
│  7. If playbook linked → AI offers "Want a deeper analysis?" │
│     → loads full governed playbook via getPlaybook            │
└──────────────────────────────────────────────────────────────┘
```

### Query Pattern: Enriched Prompt List

```sql
SELECT
  p.id,
  p.name,
  p.custrecord_atlas_aicomp_prompt_text AS prompt_text,
  p.custrecord_atlas_aicomp_prompt_category AS category,
  m.custrecord_dz_pm_domain AS domain,
  m.custrecord_dz_pm_subdomain AS subdomain,
  m.custrecord_dz_pm_toolset AS toolset,
  m.custrecord_dz_pm_tool_chain AS tool_chain,
  m.custrecord_dz_pm_edition AS edition,
  m.custrecord_dz_pm_artifact AS artifact,
  m.custrecord_dz_pm_complexity AS complexity,
  m.custrecord_dz_pm_playbook_ref AS playbook_id
FROM customrecord_atlas_aicomp_prompts p
LEFT JOIN customrecord_dz_prompt_meta m
  ON m.custrecord_dz_pm_prompt_ref = p.id
WHERE p.externalid LIKE 'aiprompt_crafted_%'
  AND NVL(m.custrecord_dz_pm_status, 1) = 1
  AND ROWNUM <= 200
ORDER BY m.custrecord_dz_pm_domain, p.name
```

---

## Example: Barrel Cost Trace Prompt

### Atlas Record (ID 103)

| Field | Value |
|-------|-------|
| name | Barrel Cost Trace |
| prompt_text | `<!-- crafted-intelligence ... --> Trace the complete cost history for barrel [BARREL NUMBER]...` |
| category | 6 (Manufacturing) |
| subcategory | Barrel Intelligence |
| roles | 5 (Administrator) |
| industry | 17 (Food and Beverage) |
| public | T |
| externalid | aiprompt_crafted_barrel_003 |

### Extension Record

| Field | Value |
|-------|-------|
| prompt_ref | 103 |
| prompt_extid | aiprompt_crafted_barrel_003 |
| domain | 6 (Barrel Operations) |
| subdomain | Barrel Valuation & Finance |
| toolset | barrel-intelligence |
| tool_chain | `getBarrelProfile → getBarrelCostTrace` |
| tool_deps | `["getBarrelProfile", "getBarrelCostTrace"]` |
| edition | 4 (Cross-Edition) |
| edition_notes | Distillery: includes proof gallons, cost-per-PG, angel's share. Winery: cost-per-gallon, no PG fields. |
| entry_tool | getBarrelProfile |
| params | `{"BARREL NUMBER": {"type": "text", "required": true}}` |
| artifact | T |
| artifact_type | cost-waterfall |
| playbook_ref | null |
| complexity | 2 (Standard) |
| version | 1.0.0 |
| author | Doozy Solutions |
| status | 1 (Active) |

### Embedded Meta Block (in prompt text)

```
<!-- crafted-intelligence
domain: Barrel Operations
toolset: barrel-intelligence
toolchain: getBarrelProfile → getBarrelCostTrace
entry: getBarrelProfile
edition: cross
artifact: true
artifact_type: cost-waterfall
complexity: standard
playbook: null
params:
  BARREL NUMBER:
    type: text
    required: true
    hint: Enter barrel name like "092425-02"
-->

Trace the complete cost history for barrel [BARREL NUMBER].

Show me:
1. The empty barrel acquisition cost
2. Fill costs (liquid + barrel components)
3. Every posting transaction in chronological order with running cost balance
4. Current total value and cost per proof gallon (distillery) or cost per gallon (winery)

If the barrel has been harvested, include the angel's share analysis: original PG vs. harvest PG, loss percentage, and final cost per PG at harvest.
```

---

## Alignment with Existing Architecture

| Crafted Intelligence Component | Relationship to Extension Record |
|-------------------------------|----------------------------------|
| **Toolset Registry** (`toolset-registry.yaml`) | `toolset` field references package names; `tool_deps` references function names from the registry |
| **Prompt Engine** (`customrecord_dz_analysis_prompt`) | `playbook_ref` links companion prompts to governed playbooks as lightweight entry points |
| **Intelligence Config** (`customrecord_dz_intel_config`) | `edition` field aligns with `custrecord_dz_ic_editions`; runtime edition check uses same detection logic |
| **Domain List** (`customlist_dz_ap_domain`) | Shared between playbooks and companion prompts — same domain taxonomy |
| **Oracle AI Connector Instructions** (agent skill) | Tool chain + entry tool align with Oracle's tool selection priority; artifact triggers align with Redwood formatting rules |

---

## Deployment Plan

### Phase 1: SDF Objects (Week 1)
1. Add 3 new custom lists to `prompt-engine` package: `customlist_dz_pm_edition`, `customlist_dz_pm_complexity`, `customlist_dz_pm_status`
2. Add 3 new values to existing `customlist_dz_ap_domain`: Barrel Operations (6), Supply Chain (7), Quality (8)
3. Create `customrecord_dz_prompt_meta` record type with all 18 fields
4. Add `aidescription` to every field and the record type
5. Deploy via `suitecloud project:deploy` from `packages/prompt-engine`

### Phase 2: Seed Extension Records (Week 1)
1. Create extension records for all 12 existing barrel companion prompts via `ns_createRecord`
2. Update the prompt text on all 12 barrel prompts to include the embedded meta block
3. Verify via SuiteQL JOIN that extension records link correctly

### Phase 3: Custom Tool Script (Week 2)
1. Build a `getPromptMeta` tool in the prompt-engine toolset that:
   - Accepts a companion prompt ID or external ID
   - Returns the extension metadata (tool chain, edition, params, artifact hints)
   - Optionally validates tool availability against the MCP connector
2. This gives the AI a single call to get full Crafted context for any companion prompt

### Phase 4: Expand to Other Domains (Week 2-3)
1. Write companion prompts + extension records for lot-profitability domain
2. Write companion prompts + extension records for inventory-supply domain
3. Write companion prompts + extension records for compliance-audit domain
4. Write companion prompts + extension records for MRP intelligence domain

---

## Open Questions

1. **Custom Suitelet wrapper?** Should we build a Crafted-branded Suitelet that wraps Oracle's Companion Library but adds edition filtering and Crafted metadata? Or rely on the embedded meta block for runtime context?

2. **Tool validation at prompt selection time?** When a user selects a companion prompt, should the system verify that all required tools are deployed and connected before showing the prompt? This would prevent users from running prompts that will fail due to missing toolsets.

3. **Prompt Studio parameter UI?** Does Oracle's Prompt Studio support structured parameter input (dropdowns, date pickers) or only free text replacement of `[BRACKETS]`? If only free text, the `params` schema is advisory for the AI rather than driving UI.

4. **Versioning strategy?** When we update a prompt's text or tool chain, should we create a new Atlas record (new ID, new external ID) or update in place? In-place updates are simpler but lose history. New records preserve history but create duplicates.

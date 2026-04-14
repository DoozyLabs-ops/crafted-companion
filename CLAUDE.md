# CLAUDE.md — Crafted Companion v2

---

## IDENTITY & ROLE

You are a **Senior NetSuite Developer & Solutions Architect** with deep expertise in SuiteScript 2.x, NetSuite AI Connector (MCP), SDF deployment, and Custom Tool Script development for Crafted ERP. You build production-grade AI companion infrastructure that is native to Oracle's AI Companion framework.

You are building **Crafted Companion v2** — a ground-up redesign of Crafted Intelligence's prompt delivery layer, built natively on Oracle's AI Companion framework. The v1 Prompt Engine is being **retired** and replaced entirely by companion-native architecture.

---

## PROJECT OVERVIEW

### Objective

Crafted Intelligence v1 built a parallel prompt delivery system (the Prompt Engine) with its own custom records, tools, and UI — completely invisible to Oracle's Companion Library. v2 retires that system and rebuilds everything on Oracle's native AI Companion framework (`atlas_aicomp`).

The result: Crafted prompts appear natively in Oracle's Companion Library alongside Oracle's own prompts. No parallel system, no shadow UI, no duplicate discovery mechanisms. One prompt framework, extended with Crafted domain intelligence via an extension record (`customrecord_dz_prompt_meta`) and an embedded meta block format.

### Architecture Decision

See **ADR-001** (`docs/specs/ADR-001-companion-native-architecture.md`) for the full decision record, including:
- Complete v1 → v2 concept migration map
- What's retained, retired, and new
- Layer architecture diagram
- Embedded meta block v2 format
- Tiered governance model
- New companion toolset (replacing 12 Prompt Engine tools with 4-5 focused tools)

### What's Retained (Data Layer)

| Component | Purpose | Why It Stays |
|-----------|---------|-------------|
| 53 Custom Tool Scripts (7 packages) | Data queries across all domains | Platform-agnostic data layer works regardless of prompt delivery |
| `detectAccountConfig` / `getAccountConfig` | Edition/feature detection (33 probes) | Critical for v2's edition-aware prompt filtering |
| `customrecord_dz_intel_config` | Account feature detection singleton | Used by detectAccountConfig |
| `customrecord_dz_brand_profile` | Brand identity for artifact styling | Still needed for Redwood token overrides |
| `toolset-registry.yaml` | Master catalog of tools, packages, metadata | Single source of truth |
| SDF packages (barrel-intelligence, lot-profitability, etc.) | Independent deployable tool packages | No changes needed |

### What's Retired (v1 Prompt Engine)

| Component | v2 Replacement |
|-----------|---------------|
| `customrecord_dz_analysis_prompt` (playbooks) | Atlas companion prompts + embedded meta blocks |
| `customrecord_dz_ap_section` (modular sections) | Meta block `steps:` array |
| `customrecord_dz_ap_shared_sec` (shared sections) | Reference files in `prompts/` directory |
| `customrecord_dz_ap_exec_log` (execution log) | `customrecord_dz_exec_log` (simplified) |
| `customlist_dz_ap_sec_type` | N/A (no modular sections) |
| `customlist_dz_ap_exec_status` | Simplified status on new log |
| `customlist_dz_ap_status` | `customlist_dz_pm_status` |
| Prompt Engine toolset (12 tools) | Companion toolset (4-5 new tools) |

### What's New

| Component | Purpose |
|-----------|---------|
| `customrecord_dz_prompt_meta` (extension record) | Links to Atlas prompt by FK; stores domain, toolset, tool chain, steps, edition, governance, safety rules, params, artifact hints |
| `customrecord_dz_exec_log` (simplified log) | Lightweight execution tracking: prompt ID, tools called, success/failure, duration |
| `customlist_dz_pm_edition` | distillery, winery, brewery, cross-edition |
| `customlist_dz_pm_complexity` | minimal, standard, governed, supervised |
| `customlist_dz_pm_status` | Active, Draft, Deprecated, Testing |
| Crafted Companion Library (UIF SPA Suitelet) | Domain-filtered, edition-aware prompt browser built with Oracle's UIF framework. Hard tool validation: prompts hidden if required toolset not deployed. |
| `getPromptMeta` tool | Read extension metadata for a companion prompt |
| `seedPrompt` tool | Create Atlas prompt + extension record in one idempotent operation |
| `updatePrompt` tool | Update prompt text and/or extension record fields |
| `logExecution` tool | Lightweight execution logging |

### NetSuite Modules Involved

- AI Connector Service (MCP Standard Tools SuiteApp)
- AI Companion SuiteApp (`atlas_aicomp` — bundle-locked, read/write to data only)
- Custom Records (extension metadata, execution log, custom lists)
- UIF SPA Suitelet (Crafted Companion Library — Phase 1, built with `@uif-js/core` + `@uif-js/component`)
- SuiteQL (query layer for enriched prompt listings)

### Deployment Method

SDF project deployed via `suitecloud project:deploy` as an independent package (`crafted-companion`).

### Environments

| Environment | Account ID | Purpose | Auth ID |
|-------------|-----------|---------|---------|
| Distillery Demo | TSTDRV1912378 | Primary development & testing | doozy-distillery-demo |
| Winery Demo | TSTDRV1915090 | Cross-edition validation | doozy-winery-demo |

---

## TASK CHUNKING PROTOCOL — READ THIS FIRST

This project uses mandatory task decomposition. **Never attempt to build an entire feature in a single response.**

### The Chunking Decision Tree

Before starting ANY task, run this checklist:

```
IS THIS TASK CHUNKABLE?
|- Will the response exceed ~150 lines of code? -> CHUNK IT
|- Does it require more than 2 files to be created? -> CHUNK IT
|- Does it involve both design AND implementation? -> CHUNK IT
|- Does it touch more than one NetSuite module? -> CHUNK IT
|- Does it require research + code + documentation? -> CHUNK IT
'- None of the above? -> Execute directly, but still:
   - Confirm the plan before writing code
   - Deliver working code, then improve iteratively
```

### Anti-Stall Rules
1. **No monolith scripts.** If a module exceeds 300 lines, split into helper modules.
2. **No multi-file dumps.** Create one file per response.
3. **Design first, code second.** Output the design/pseudocode first, confirm, THEN implement.
4. **Summarize, don't repeat.** When referencing existing code, summarize -- don't paste it back.
5. **Checkpoint often.** After 2-3 chunks, produce a status summary.

---

## FOLDER STRUCTURE

```
packages/crafted-companion/
|- CLAUDE.md                              <- You are here
|- README.md                              <- Project overview & setup
|- src/
|  |- FileCabinet/
|  |  '- SuiteScripts/
|  |     '- DoozyTools/
|  |        |- companion-tools/           <- New companion toolset scripts
|  |        |- spa/                       <- UIF SPA source (Crafted Companion Library)
|  |        |  |- app.js                  <- SPA entry point (root component)
|  |        |  |- components/             <- UIF components (cards, modals, filters)
|  |        |  |- store/                  <- State management (Store, Reducer)
|  |        |  '- api.js                  <- Ajax calls to Suitelet backend
|  |        |- suitelet/                  <- Suitelet (serves SPA + REST API backend)
|  |        '- lib/                       <- Shared utility modules
|  '- Objects/                            <- Custom records, fields, lists (SDF)
|     |- customrecord_dz_prompt_meta.xml
|     |- customrecord_dz_exec_log.xml
|     |- customlist_dz_pm_edition.xml
|     |- customlist_dz_pm_complexity.xml
|     '- customlist_dz_pm_status.xml
|- docs/
|  |- discovery/                          <- Requirements & findings
|  |  |- atlas-ai-companion-schema-trace.md
|  |  |- companion-prompt-extension-design.md
|  |  '- discovery-document.md
|  |- specs/                              <- ADRs, TDS, FDS documents
|  |  '- ADR-001-companion-native-architecture.md
|  |- oracle-agent-skills/                <- Oracle reference files (downloaded from GitHub)
|  |  |- netsuite-uif-spa-reference/      <- UIF component API + type defs (core.d.ts, component.d.ts)
|  |  |- netsuite-ai-connector-instructions/ <- Redwood tokens, tool selection, SuiteQL guardrails
|  |  '- netsuite-sdf-roles-and-permissions/ <- Permission IDs and role templates
|  |- kb/
|  |  |- end-user/                        <- End-user documentation
|  |  '- admin/                           <- Admin documentation
|  '- deployment/                         <- Deployment instructions & logs
|- prompts/                               <- Companion prompt definitions by domain
|  |- barrel-intelligence/
|  |- lot-profitability/
|  |- inventory-supply/
|  |- compliance-audit/
|  |- mrp-intelligence/
|  '- batch-genealogy/
|- tests/
|  |- unit/                               <- Unit test scripts
|  '- scenarios/                          <- UAT test scenarios
|- config/
|  '- environments.json                   <- Environment-specific settings
'- audit-trail/
   |- gate_checkpoint_log.md              <- Stage gate approvals
   '- change_log.md                       <- Change history
```

---

## CRITICAL DEVELOPMENT RULES

These rules are inherited from the parent Crafted Intelligence project and are non-negotiable:

1. **ES5 only** -- No async/await, const/let, template literals, or arrow functions. Use `var`, string concatenation, and `.then()` chains.
2. **No `enum` in schemas** -- NetSuite silently drops tools with `enum` in JSON Schema. Embed valid values in `description` text.
3. **Both expose flags** -- Every toolset XML must include `<exposetoaiconnector>T</exposetoaiconnector>` AND `<exposeto3rdpartyagents>T</exposeto3rdpartyagents>`.
4. **Parameterized queries** -- Always use `?` placeholders with `params: []`. Never interpolate.
5. **Governance budget is 1,000** -- Not 10,000. Each query costs ~10 units.
6. **Reconnect after deploy** -- MCP connector caches tool inventory. Disconnect/reconnect after deploying new tools.
7. **All SDF objects need aidescription** -- Every custom record, field, and list value must have an `<aidescription>` element (max 280 chars).

---

## ATLAS AI COMPANION -- BUNDLE-LOCK CONSTRAINTS

The Oracle AI Companion SuiteApp is fully bundle-locked:

- `customrecord_atlas_aicomp_prompts` -- data is read/writable, but **no custom fields can be added**
- `customrecordtype` / `customfield` / `customlist` -- Atlas objects are **invisible** in these SuiteQL metadata tables
- Category list -- **7 values, custom list, not extensible** (Financial=1, Visualizations=2, Order to Cash=3, Item Management=4, Procure to Pay=5, Manufacturing=6, System Administration=7)
- Role list -- **custom record type (`customrecord_atlas_aicomp_prompt_roles`), EXTENSIBLE** — 14 Oracle values + we can create Crafted-specific roles (Distiller, Cellar Master, Production Manager, etc.) via the "+" button in Prompt Studio or `ns_createRecord`
- Industry list -- **39 values, custom list, not extensible**, including Food and Beverage=17
- Mapping Method list -- `customlist_atlas_aicomp_mapping_method` — at least "AI Mapped" (`val_atlas_aicomp_mapped`). Used by Role Mapper Config Suitelet.
- Subcategory -- **free text field** (not a list), used for Crafted subdomain tagging

### What We CAN Do

- Create/update/read prompt records via REST API (`ns_createRecord`, `ns_updateRecord`)
- Query prompt data via SuiteQL (`SELECT ... FROM customrecord_atlas_aicomp_prompts`)
- **Create Crafted-specific roles** in `customrecord_atlas_aicomp_prompt_roles` (extensible custom record, not a locked list)
- Use category 6 (Manufacturing) for all Crafted prompts
- Use subcategory (free text) for domain tagging ("Barrel Intelligence", "Lot Profitability", etc.)
- Use industry 17 (Food and Beverage) for all Crafted prompts
- Set `sdf_seeded = F` so prompts are editable by clients
- Use `externalid` pattern `aiprompt_crafted_[domain]_NNN` to avoid collisions with Oracle's `aiprompt_111`-`aiprompt_210`

### Multi-Select Field Format

Roles and Industries are multi-select sublists. The correct REST API format:
```json
{
  "custrecord_atlas_aicomp_prompt_roles": {"items": [{"id": "5"}]},
  "custrecord_atlas_aicomp_prompt_inds": {"items": [{"id": "17"}]}
}
```

Category is a single-select list reference:
```json
{
  "custrecord_atlas_aicomp_prompt_category": {"id": "6"}
}
```

---

## ORCHESTRATION VIA EXTENSION RECORD

**Design Decision (2026-04-14):** Live testing confirmed that Oracle's Companion Library renders prompt text as plain text — HTML comments are displayed verbatim to users. Therefore, **no metadata is embedded in prompt text.** All orchestration metadata lives in the extension record (`customrecord_dz_prompt_meta`) and is retrieved via `getPromptMeta`.

Prompt text stays clean and human-readable. The AI's first step when executing any Crafted prompt is to call `getPromptMeta` to get the full orchestration context.

### Extension Record Fields (Expanded from Original 18)

The extension record now carries orchestration data that was originally planned for the embedded meta block:

| Field | Type | Purpose |
|-------|------|---------|
| `prompt_ref` | Integer (FK) | Links to Atlas companion prompt |
| `domain` | List (customlist_dz_ap_domain) | Crafted domain: Barrel Ops, Lot Profitability, etc. |
| `subdomain` | Free Text | Finer-grained categorization |
| `toolset` | Free Text | Toolset script ID (e.g., "barrel-intelligence") |
| `tool_chain` | Free Text | Ordered tool sequence (e.g., "getBarrelProfile -> getBarrelCostTrace") |
| `entry_tool` | Free Text | First tool to call |
| `steps` | Long Text (JSON) | Ordered steps with call, purpose, condition, depends_on |
| `tool_deps` | Long Text (JSON) | Required toolsets that must be deployed |
| `edition` | List (customlist_dz_pm_edition) | distillery, winery, brewery, cross |
| `edition_notes` | Long Text | Edition-specific behavior guidance |
| `params` | Long Text (JSON) | Parameter schemas with types, hints, tool mappings |
| `safety_rules` | Long Text (JSON array) | Non-hallucination and data quality rules |
| `governance` | List (customlist_dz_pm_complexity) | minimal, standard, governed, supervised |
| `artifact` | Checkbox | Whether prompt generates a visual artifact |
| `artifact_type` | Free Text | e.g., cost-waterfall, kpi-dashboard, aging-chart |
| `version` | Free Text | Semantic version (e.g., "1.0.0") |
| `author` | Free Text | Who created/maintains this prompt |
| `status` | List (customlist_dz_pm_status) | Active, Draft, Deprecated, Testing |

### `getPromptMeta` Response Example

```json
{
  "prompt_id": 103,
  "prompt_name": "Barrel Cost Trace",
  "domain": "Barrel Operations",
  "toolset": "barrel-intelligence",
  "tool_chain": "getBarrelProfile -> getBarrelCostTrace",
  "entry_tool": "getBarrelProfile",
  "steps": [
    { "call": "getBarrelProfile", "purpose": "Resolve barrel identity", "params_from": ["BARREL NUMBER"] },
    { "call": "getBarrelCostTrace", "purpose": "Trace cost history", "condition": "profile.status != 'Empty'" }
  ],
  "edition": "cross",
  "governance": "standard",
  "safety_rules": ["Never fabricate barrel costs", "Flag zero-cost barrels as data quality issues"],
  "params": { "BARREL NUMBER": { "type": "text", "required": true, "hint": "e.g. 092425-02" } },
  "artifact": true,
  "artifact_type": "cost-waterfall"
}
```

### Governance Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `minimal` | Single tool, read-only, low risk | Barrel lookup, inventory count |
| `standard` | 2-3 tool chain, moderate analysis | Cost trace, aging report, valuation |
| `governed` | Complex multi-tool with safety checks | Portfolio analysis, compliance audit, financial reporting |
| `supervised` | High-impact (creates/updates records) | Prompt seeding, record updates, financial decisions |

### AI Invocation Flow

1. User selects a Crafted prompt from the Companion Library (or AI identifies one)
2. AI calls `getPromptMeta(prompt_id)` to get orchestration context
3. AI reads `governance` level to determine behavior tier
4. AI reads `params` to request any required user input
5. AI calls `detectAccountConfig` if edition-aware logic is needed
6. AI executes `steps` in order, respecting conditions and dependencies
7. AI generates artifact if `artifact: true`
8. AI calls `logExecution` to record the run

---

## EXISTING COMPANION PROMPTS (Seeded)

### Barrel Intelligence -- 12 prompts

All seeded in TSTDRV1912378 with:
- Category: 6 (Manufacturing)
- Subcategory: "Barrel Intelligence"
- Role: 5 (Administrator)
- Industry: 17 (Food and Beverage)
- External ID pattern: `aiprompt_crafted_barrel_NNN`

| ID | Name | External ID | Tool Chain |
|----|------|------------|------------|
| 101 | Barrel Profile Lookup | aiprompt_crafted_barrel_001 | getBarrelProfile |
| 102 | Barrel Activity Timeline | aiprompt_crafted_barrel_002 | getBarrelProfile -> getBarrelActivityHistory |
| 103 | Barrel Cost Trace | aiprompt_crafted_barrel_003 | getBarrelProfile -> getBarrelCostTrace |
| 104 | Barrel Operations KPI Dashboard | aiprompt_crafted_barrel_004 | getBarrelKPIs |
| 105 | Barrel Aging Distribution | aiprompt_crafted_barrel_005 | getBarrelAging |
| 106 | Barrel Inventory Snapshot | aiprompt_crafted_barrel_006 | getBarrelInventory |
| 107 | Barrel Portfolio Valuation | aiprompt_crafted_barrel_007 | getBarrelValuation |
| 108 | Angels Share Analysis | aiprompt_crafted_barrel_011 | getBarrelKPIs |
| 109 | Cooperage Performance Comparison | aiprompt_crafted_barrel_012 | getBarrelAging + getBarrelInventory |
| 201 | Single Barrel Valuation | aiprompt_crafted_barrel_008 | getBarrelProfile -> getBarrelValuation -> getBarrelCostTrace |
| 202 | Barrel Location Map | aiprompt_crafted_barrel_009 | getBarrelLocationMap |
| 203 | Harvest-Ready Barrels | aiprompt_crafted_barrel_010 | getBarrelInventory -> getBarrelValuation |

### Domains Pending Prompt Creation

- Lot Profitability (7 tools, ~10-15 prompts)
- Inventory & Supply Chain (9 tools, ~15-20 prompts)
- Compliance & Audit (8 tools, ~10-15 prompts)
- MRP Intelligence (6 tools, ~8-12 prompts)
- Batch & Genealogy (3 tools, ~5-8 prompts, Winery edition)

---

## NEW COMPANION TOOLSET

Replaces the 12-tool Prompt Engine with focused tools:

| Tool | Purpose | Replaces |
|------|---------|----------|
| `getPromptMeta` | Read extension metadata for a companion prompt. Returns tool chain, edition, params, governance level, artifact hints. | `getPlaybook`, `getPlaybookSection`, `listPlaybooks` |
| `seedPrompt` | Create a companion prompt in Atlas + extension record in one operation. Idempotent via externalid matching. | `createPlaybook` |
| `updatePrompt` | Update companion prompt text and/or extension record fields. | `updatePlaybook` |
| `logExecution` | Lightweight execution log -- prompt ID, tools called, success/failure, duration. | `logPlaybookExecution` (simplified) |
| `detectAccountConfig` | **RETAINED** -- Account feature detection (33 probes). | Same |
| `getAccountConfig` | **RETAINED** -- Read cached config singleton. | Same |

---

## OPEN DESIGN QUESTIONS

These are tracked and will be resolved during Scoping:

1. ~~**Custom Suitelet wrapper?**~~ **RESOLVED (2026-04-14):** Build a UIF SPA Suitelet as Phase 1 deliverable using Oracle's `@uif-js/core` + `@uif-js/component`. Domain tabs, edition filtering, search, prompt detail modals. Matches Oracle's Companion Library look and feel natively.

2. ~~**Tool validation at prompt selection time?**~~ **RESOLVED (2026-04-14):** HARD validation — required. Prompts are **hidden** (not shown with a warning) if their required toolset is not deployed and connected. The SPA queries tool availability via `detectAccountConfig` and the extension record's `tool_deps` field, and only renders prompts whose toolsets are confirmed present. No soft warnings, no "might not work" badges — if the tools aren't there, the prompt doesn't appear.

3. ~~**Prompt Studio parameter UI?**~~ **RESOLVED (2026-04-14):** Prompt Studio is a plain text area. `[BRACKET]` placeholders are just text, not structured input fields. `params` schema in the extension record is **advisory for the AI** — the AI uses it to validate user input and provide hints, but no UI drives it.

4. ~~**Versioning strategy?**~~ **RESOLVED (2026-04-14):** Update in place. The Atlas prompt record is updated directly (same ID/externalID). The extension record's `version` field tracks the semantic version (1.0.0 → 1.1.0 → 2.0.0). `logExecution` records which version was running at execution time. No duplicate prompt records. Phase 2 can add a version history sub-record if full audit trail is needed.

---

## ORACLE AGENT SKILLS -- REFERENCE

Oracle publishes 3 agent skills in `oracle/netsuite-suitecloud-sdk/packages/agent-skills/`:

1. **netsuite-ai-connector-instructions** -- System prompt for AI+MCP sessions. Tool selection priority (Reports -> Saved Searches -> Records -> SuiteQL), Redwood design tokens, SuiteQL safety guardrails, multi-subsidiary/currency rules.

2. **netsuite-sdf-roles-and-permissions** -- SDF permission reference. `permissions.json` (48KB) with every standard NetSuite permission ID. Used for role design and deployment permissions.

3. **netsuite-uif-spa-reference** -- UIF SPA component reference. Full type definitions for `@uif-js/core` and `@uif-js/component`. Used if we build a UIF-based Companion Library wrapper.

Crafted Companion layers on top of Oracle's `netsuite-ai-connector-instructions` -- our prompts provide domain-specific tool chains and context while Oracle's skill handles generic NetSuite behavior.

---

## STAGE GATE PROTOCOL

No phase advances without explicit sign-off.

```
DISCOVERY -> SCOPING GATE:
  [x] Schema trace document complete (atlas_aicomp)
  [x] Extension record design reviewed
  [x] v2 Architecture Decision Record (ADR-001) written
  [x] Open design questions resolved (OQ-001: SPA Phase 1, OQ-002: hard tool validation, OQ-003: params advisory, OQ-004: update in place)
  [x] Live test: Prompt Studio parameter UI behavior (OQ-003) — plain text only
  [x] Live test: Embedded meta block visibility (A-002) — HTML comments visible; abandoned
  [x] HITM approval of discovery document + ADR-001

SCOPING -> PLANNING GATE:
  [x] Scope document with deliverables list (docs/specs/scope-document.md)
  [x] Effort estimates per phase (Phase 1: ~352 hrs, Phase 2: ~84.5 hrs)
  [x] Phase 1 vs Phase 2 boundary defined
  [x] HITM approval recorded (2026-04-14)

PLANNING -> DEVELOPMENT GATE:
  [ ] SDF object XML written (record type, lists)
  [x] Chunked task breakdown exists (docs/task_plan.md — 50 chunks, 5 phases, 17 sessions)
  [ ] HITM approval recorded

DEVELOPMENT -> QA GATE:
  [ ] Extension record deployed and queryable
  [ ] All barrel prompts have extension records + meta blocks
  [ ] New companion tools implemented and tested
  [ ] HITM approval recorded

QA -> DEPLOYMENT GATE:
  [ ] Cross-edition validation (distillery + winery)
  [ ] All domain prompts seeded
  [ ] v1 Prompt Engine records marked inactive
  [ ] Deployment instructions written
  [ ] HITM approval recorded
```

---

## NON-HALLUCINATION SAFEGUARDS

- **Never fabricate NetSuite internal IDs.** Atlas record IDs (101-109, 201-203) are confirmed via SuiteQL. Always verify before referencing.
- **Never assume Atlas fields exist.** The record type is bundle-locked. Only use fields confirmed in the schema trace.
- **Never assume category/role/industry list values.** Use only values confirmed by SuiteQL queries against the live data.
- **Never claim a prompt "works" without testing it via the AI Connector.** Seeding a prompt record doesn't mean the tool chain executes correctly.
- **Never modify Oracle's seeded prompts** (externalid `aiprompt_111`-`aiprompt_210`, `sdf_seeded = T`). The Record Locking UE will prevent it anyway.
- **Always use `aiprompt_crafted_` prefix** for Crafted prompt external IDs to avoid collisions.
- **Never reference v1 Prompt Engine tools** (listPlaybooks, getPlaybook, etc.) in new companion prompts. Those tools are retired.

---

## HUMAN-IN-THE-MIDDLE CHECKPOINTS

Pause and get explicit approval before:
- **Deploying SDF objects** (new record types, lists, fields)
- **Creating/updating Atlas prompt records** (writing to Oracle's bundle data)
- **Changing the embedded meta block format** (affects all existing prompts)
- **Adding new domain values** to shared lists
- **Any change to production account**
- **Retiring v1 objects** (marking custom records inactive)

---

## WORKFLOW: STARTING A SESSION

1. **Orient:** Read this CLAUDE.md + ADR-001.
2. **Status check:** Review the gate checkpoint log and current project state.
3. **Identify current phase** and what chunk we're on.
4. **Propose the next chunk** -- what you'll build, what it depends on, what it produces.
5. **Get approval** before writing code.
6. **Execute the chunk** -- deliver working, tested code.
7. **Gate check** -- confirm quality, propose next chunk.

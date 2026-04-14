# ADR-001: Companion-Native Architecture for Crafted Intelligence v2

**Status:** APPROVED
**Date:** 2026-04-14
**Decision Makers:** Luke (Doozy Solutions)
**Context:** Oracle's AI Companion SuiteApp provides the native prompt delivery infrastructure for NetSuite's AI Connector Service. Crafted Intelligence v1 built a parallel system (Prompt Engine) that is invisible to the Companion UI. v2 retires the Prompt Engine and redesigns Crafted Intelligence to be native to Oracle's Companion framework.

---

## Decision

**Retire the Crafted Intelligence Prompt Engine and redesign the entire intelligence delivery layer to be native to Oracle's AI Companion framework.** Custom Tool Scripts (the data layer) are retained. Everything above the tool layer is rebuilt.

---

## What Changes

### Concept Migration Map

| v1 Concept | v1 Implementation | v2 Equivalent | v2 Implementation |
|-----------|-------------------|---------------|-------------------|
| **Playbook** | `customrecord_dz_analysis_prompt` — monolithic or modular prompt stored in custom record | **Companion Prompt + Extension Record** | `customrecord_atlas_aicomp_prompts` for prompt text (clean, user-facing) + `customrecord_dz_prompt_meta` for all orchestration metadata (tool chain, governance, edition, params, safety rules). AI retrieves context via `getPromptMeta`. |
| **Playbook Sections** | `customrecord_dz_ap_section` — child records with type, sort order, conditions | **Extension Record Fields** | Orchestration steps stored in extension record's `tool_chain` and `steps` (JSON) fields. Conditional logic via `edition` and `condition` fields. No separate child records needed. |
| **Shared Section Library** | `customrecord_dz_ap_shared_sec` — reusable sections across playbooks | **Prompt Templates / Partials** | Standard prompt text patterns maintained in `prompts/` directory as reference files. AI assembles from meta block instructions rather than NetSuite record lookups. |
| **Execution Log** | `customrecord_dz_ap_exec_log` — tracks playbook runs with confidence, duration, tool calls | **Companion Usage Counters + Lightweight Log** | Oracle's built-in `count_claude` / `count_chatgpt` / `count_copy` fields track basic usage. Detailed logging via a lightweight `customrecord_dz_exec_log` (simplified from v1) — prompt ID, tools called, success/failure, duration. |
| **Intelligence Config** | `customrecord_dz_intel_config` — account feature detection singleton | **KEEP AS-IS** | `detectAccountConfig` and `getAccountConfig` tools are retained. They serve the same purpose: runtime edition/feature detection for conditional prompt behavior. |
| **Brand Profile** | `customrecord_dz_brand_profile` — colors, fonts, logos, templates | **Oracle Redwood Tokens + Extension** | Oracle's agent-skills spec defines Redwood design tokens. Crafted extends with brand-specific overrides stored in the meta block's `branding:` section or the existing brand profile record. |
| **Domain List** | `customlist_dz_ap_domain` — 5 values | **Extended Domain List** | Same list, expanded with new values (Barrel Operations, Supply Chain, Quality). Shared between extension records and any remaining Crafted records. |
| **Playbook Status** | `customlist_dz_ap_status` — Draft/Active/Retired | **Extension Record Status** | `customlist_dz_pm_status` on the extension record: Active, Draft, Deprecated, Testing. Atlas prompt `isinactive` flag for hard disable. |
| **listPlaybooks** | Custom Tool Script — discovers available playbooks | **RETIRE** | Discovery happens through Oracle's Companion Suitelet UI or via SuiteQL query of Atlas prompts filtered by Crafted externalid pattern. |
| **getPlaybook** | Custom Tool Script — retrieves and assembles playbook | **RETIRE** | AI reads prompt text directly from the Companion UI. The embedded meta block provides all orchestration context. No separate retrieval step. |
| **getPlaybookSection** | Custom Tool Script — retrieves a single section | **RETIRE** | No modular sections in v2. Orchestration steps are embedded in the meta block. |
| **createPlaybook** | Custom Tool Script — creates a playbook record | **seedPrompt** (new) | New tool creates Atlas companion prompt + extension record in one operation. |
| **updatePlaybook** | Custom Tool Script — updates a playbook record | **updatePrompt** (new) | New tool updates Atlas prompt text + extension record fields. |
| **logPlaybookExecution** | Custom Tool Script — logs execution results | **logExecution** (new, simplified) | Lightweight execution log — prompt ID, timestamp, tool calls, success/failure. Drops v1's confidence scoring and verification pass rate (those were governance overhead that added complexity without proven value). |
| **migratePlaybookToSections** | Custom Tool Script — splits monolithic into modular | **RETIRE** | No modular sections concept. Migration from v1 is a one-time data export, not an ongoing tool. |

### What's Retained (Unchanged)

| Component | Why It Stays |
|-----------|-------------|
| 53 Custom Tool Scripts (7 packages) | Data layer is platform-agnostic. Tools work regardless of prompt delivery mechanism. |
| `detectAccountConfig` / `getAccountConfig` | Edition detection is critical for v2's edition-aware prompt filtering. |
| `customrecord_dz_intel_config` | Singleton config record used by detectAccountConfig. |
| `customrecord_dz_brand_profile` | Brand identity still needed for artifact styling. |
| `toolset-registry.yaml` | Master catalog of tools, packages, and metadata. |
| SDF packages (barrel-intelligence, lot-profitability, etc.) | Independent deployable units. No changes needed. |

### What's Retired

| Component | Replacement | Migration Path |
|-----------|------------|----------------|
| `customrecord_dz_analysis_prompt` | Atlas companion prompts | Export playbook content → create companion prompts with embedded meta blocks |
| `customrecord_dz_ap_section` | Embedded meta block `steps:` | Extract section content → embed in prompt text or meta block |
| `customrecord_dz_ap_shared_sec` | Reference files in `prompts/` | Export shared sections → store as markdown templates |
| `customrecord_dz_ap_exec_log` | `customrecord_dz_exec_log` (simplified) | Data stays for historical reference; new log record is lighter |
| `customlist_dz_ap_sec_type` | N/A | No modular sections in v2 |
| `customlist_dz_ap_exec_status` | Simplified status on new log | Completed / Failed / Partial |
| `customlist_dz_ap_status` | `customlist_dz_pm_status` | Active / Draft / Deprecated / Testing |
| Prompt Engine toolset (12 tools) | Companion toolset (4-5 new tools) | New tools replace old ones |

---

## v2 Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                         │
│                                                                     │
│  ┌─────────────────────┐    ┌────────────────────────────────────┐ │
│  │  Oracle Companion    │    │  Crafted Companion Library (SPA)  │ │
│  │  Library Suitelet    │    │  UIF SPA Suitelet — Phase 1       │ │
│  │  (Oracle's bundle)   │    │  Domain tabs, edition filter,     │ │
│  │                      │    │  search, prompt detail modals     │ │
│  └──────────┬──────────┘    └──────────────┬─────────────────────┘ │
│             │                               │                       │
│             └───────────┬───────────────────┘                       │
│                         ▼                                           │
├─────────────────────────────────────────────────────────────────────┤
│                      PROMPT STORAGE LAYER                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  customrecord_atlas_aicomp_prompts (Oracle's bundle)         │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  name, prompt_text (clean, user-facing only),          │  │  │
│  │  │  category, subcategory, roles, industry, public,       │  │  │
│  │  │  sdf_seeded, count_claude, count_chatgpt, count_copy   │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
│                              │ FK (prompt_ref)                      │
│  ┌──────────────────────────▼───────────────────────────────────┐  │
│  │  customrecord_dz_prompt_meta (Our extension)                  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  domain, subdomain, toolset, tool_chain, tool_deps,    │  │  │
│  │  │  edition, edition_notes, entry_tool, params,           │  │  │
│  │  │  artifact, artifact_type, playbook_complexity,         │  │  │
│  │  │  governance_level, version, author, status             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  customrecord_dz_intel_config (Retained from v1)              │  │
│  │  customrecord_dz_brand_profile (Retained from v1)             │  │
│  │  customrecord_dz_exec_log (Simplified from v1)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     ORCHESTRATION LAYER                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  getPromptMeta (retrieves orchestration from extension rec)   │  │
│  │                                                               │  │
│  │  Returns: domain, toolset, tool_chain, steps (JSON),          │  │
│  │  edition, edition_notes, governance, safety_rules,            │  │
│  │  params (JSON), artifact_type, complexity                     │  │
│  │                                                               │  │
│  │  AI uses this metadata to:                                    │  │
│  │  1. Determine tool invocation order                           │  │
│  │  2. Apply edition-specific logic                              │  │
│  │  3. Enforce governance level                                  │  │
│  │  4. Request parameters from user                              │  │
│  │  5. Generate appropriate artifact                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                       COMPANION TOOLS                               │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐ │
│  │ getPromptMeta│ │ seedPrompt   │ │ logExecution  │ │getAccount │ │
│  │ (read meta)  │ │ (create pair)│ │ (lightweight) │ │Config     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                      DATA TOOL LAYER (Retained)                     │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │  Barrel     │ │  Lot       │ │  Inventory │ │ Compliance │      │
│  │  Intelligence│ │ Profitability│ │ & Supply  │ │  & Audit  │      │
│  │  (8 tools)  │ │  (7 tools) │ │  (9 tools) │ │  (8 tools) │      │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                      │
│  │  MRP       │ │  Batch &   │ │  Prompt    │                      │
│  │Intelligence│ │  Genealogy │ │  Engine*   │  * detectAccountConfig│
│  │  (6 tools) │ │  (3 tools) │ │  (2 tools) │    getAccountConfig  │
│  └────────────┘ └────────────┘ └────────────┘    (retained only)   │
├─────────────────────────────────────────────────────────────────────┤
│                    ORACLE PLATFORM LAYER                            │
│                                                                     │
│  MCP Connector  │  AI Companion SuiteApp  │  NetSuite REST API     │
└─────────────────────────────────────────────────────────────────────┘
```

### Extension Record as Orchestration Layer

**Design Decision (2026-04-14):** Live testing confirmed that Oracle's Companion Library Suitelet renders prompt text as plain text, not HTML. HTML comments (`<!-- -->`) are displayed verbatim to users. Therefore, **all orchestration metadata lives in the extension record** (`customrecord_dz_prompt_meta`), not embedded in prompt text. Prompt text stays clean and user-facing.

The AI retrieves orchestration context by calling `getPromptMeta` with the prompt ID. The tool returns the full extension record:

```json
{
  "prompt_id": 103,
  "prompt_name": "Barrel Cost Trace",
  "domain": "Barrel Operations",
  "subdomain": "Barrel Valuation & Finance",
  "toolset": "barrel-intelligence",
  "tool_chain": "getBarrelProfile → getBarrelCostTrace",
  "entry_tool": "getBarrelProfile",
  "steps": [
    {
      "call": "getBarrelProfile",
      "purpose": "Resolve barrel identity, status, location, cooperage",
      "params_from": ["BARREL NUMBER"]
    },
    {
      "call": "getBarrelCostTrace",
      "purpose": "Trace full cost history from acquisition through aging",
      "condition": "profile.status != 'Empty'",
      "depends_on": "getBarrelProfile"
    }
  ],
  "edition": "cross",
  "edition_notes": "Distillery: cost-per-PG, angel's share, proof gallons. Winery: cost-per-gallon, no PG fields.",
  "governance": "standard",
  "complexity": "standard",
  "safety_rules": [
    "Never fabricate barrel costs — all values from getBarrelCostTrace",
    "Flag barrels with zero cost as data quality issues",
    "If barrel not found, suggest searchItems first"
  ],
  "params": {
    "BARREL NUMBER": {
      "type": "text",
      "required": true,
      "hint": "Enter barrel name like '092425-02'",
      "resolves_to": "serialNumber filter on barrel tools"
    }
  },
  "artifact": true,
  "artifact_type": "cost-waterfall",
  "version": "1.0.0",
  "status": "Active"
}
```

This approach means the extension record needs additional JSON fields beyond the original 18-field design:
- `steps` (JSON) — ordered tool invocation steps with conditions and dependencies
- `safety_rules` (JSON array) — non-hallucination and data quality rules
- `params` (JSON) — parameter schemas with types, hints, and tool mappings

These replace what the embedded meta block would have carried.

**v1 section mapping:**
- v1 Section 1 (Identity & Role) → `domain`, `toolset`, `governance` fields
- v1 Section 3 (Data Requirements) → `tool_chain`, `steps` JSON
- v1 Section 4 (Retrieval Protocol) → `steps` with `depends_on`
- v1 Section 5 (Data Interpretation) → `edition_notes` field
- v1 Section 7 (Verification Tests) → `safety_rules` JSON
- v1 Section 10 (HITM Controls) → `governance` level
- v1 Section 11 (Non-Hallucination) → `safety_rules` JSON

### Governance Levels

Instead of the full 13-section framework on every prompt, v2 uses tiered governance:

| Level | Description | When to Use | What the AI Does |
|-------|-------------|-------------|-----------------|
| `minimal` | Single tool, read-only, low risk | Barrel lookup, inventory count | Execute directly, format result |
| `standard` | 2-3 tool chain, moderate analysis | Cost trace, aging report, valuation | Follow tool chain, apply edition logic, generate artifact if flagged |
| `governed` | Complex multi-tool investigation with safety checks | Portfolio analysis, compliance audit, financial reporting | Full orchestration: validate params → detect edition → execute steps → apply safety rules → flag anomalies → format with Redwood |
| `supervised` | High-impact operations (creates/updates records, financial decisions) | Prompt seeding, record updates | Require user confirmation before each write operation, log execution |

### Crafted Companion Library — UIF SPA Suitelet (Phase 1)

**Decision (2026-04-14, OQ-001 RESOLVED):** Build a UIF SPA Suitelet as a Phase 1 deliverable, not Phase 2. The SPA will mimic Oracle's Companion Library UI using Oracle's own UIF framework (`@uif-js/core`, `@uif-js/component`), ensuring native look and feel.

**Architecture:**
- **Backend:** SuiteScript 2.x Suitelet — serves the SPA shell on GET, acts as REST API on POST (queries Atlas prompts JOIN extension records, returns JSON)
- **Frontend:** UIF SPA using Oracle's component library with Redwood design tokens
- **State:** UIF `Store` + `Reducer` for filter state, search, loaded prompts
- **Data:** `Ajax.post()` to Suitelet backend for prompt data; client-side filtering/search

**UIF Components Used:**

| Component | Purpose |
|-----------|---------|
| `TabPanel` | Domain tabs (Barrel Operations, Lot Profitability, Compliance, etc.) |
| `FilterPanel` + `FilterChip` | Edition filtering, governance level filtering |
| `Card` | Prompt cards matching Oracle's card layout |
| `Modal` | Prompt detail overlay with full metadata, tool chain, actions |
| `TextBox` | Search bar (title, prompt text, tool name) |
| `Badge` | Governance level indicators, edition tags, status pills |
| `Button` | "Copy Prompt", "Send to Claude", "Copy/Open ChatGPT" actions |
| `StackPanel` | Layout container for card grid and filter bar |
| `Loader` / `Skeleton` | Loading states |
| `Banner` | Admin notices (e.g., "Deploy [toolset] to unlock [domain] prompts") |
| `ApplicationHeader` | Page header with Crafted branding |

**What it adds over Oracle's Companion Library:**
- Domain tabs (not just Oracle's 7 generic categories)
- Edition filtering (distillery/winery/brewery/cross — powered by `detectAccountConfig`)
- Governance level visibility (minimal/standard/governed/supervised badges)
- Tool chain preview (see which tools a prompt will invoke before running it)
- Hard tool validation (prompts hidden — not warned — if required toolset isn't deployed/connected)
- Extension metadata in detail modal (artifact type, params, safety rules, version)

**Reference files:** Oracle's UIF type definitions and agent-skills documentation are saved locally at `docs/oracle-agent-skills/` for development reference.

### New Companion Toolset

Replaces the 12-tool Prompt Engine with 4-5 focused tools:

| Tool | Purpose | Replaces |
|------|---------|----------|
| `getPromptMeta` | Read extension metadata for a companion prompt. Returns tool chain, edition, params, governance level, artifact hints. | `getPlaybook`, `getPlaybookSection`, `listPlaybooks` |
| `seedPrompt` | Create a companion prompt in Atlas + extension record in one operation. Idempotent via externalid matching. | `createPlaybook` |
| `updatePrompt` | Update companion prompt text and/or extension record fields. | `updatePlaybook` |
| `logExecution` | Lightweight execution log — prompt ID, tools called, success/failure, duration. | `logPlaybookExecution` (simplified) |
| `detectAccountConfig` | **RETAINED** — Account feature detection (33 probes). | Same |
| `getAccountConfig` | **RETAINED** — Read cached config singleton. | Same |

---

## Consequences

### Positive
- Crafted prompts appear natively in Oracle's Companion UI alongside Oracle's own prompts
- Crafted Companion Library SPA provides domain/edition filtering that Oracle's UI lacks
- UIF SPA built with Oracle's own component framework — native NetSuite look and feel
- No parallel prompt system to maintain — one prompt delivery mechanism
- Simpler architecture — fewer custom records, fewer tools, less governance overhead
- Oracle Redwood design tokens used throughout (consistent with NetSuite's visual language)
- Usage analytics built into Oracle's counters (count_claude, count_chatgpt)
- Agent-skills-spec compatibility enables distribution via `npx skills add`
- Customers discover Crafted prompts through a polished, filtered UI from day one

### Negative
- Dependent on Oracle's bundle-locked schema — if Oracle changes it, we adapt
- Category filtering limited to Oracle's 7 fixed values (mitigated by subcategory + extension record). Note: Roles ARE extensible (`customrecord_atlas_aicomp_prompt_roles` is a custom record type) — Crafted-specific roles can be created.
- Modular section system is lost — complex multi-step orchestration must be encoded in extension record JSON fields (mitigated by the `steps` JSON format which is simpler and more readable)
- AI must call `getPromptMeta` before executing any prompt — one extra tool call per prompt invocation (mitigated by low governance cost, < 50 units)
- Prompt text alone is not self-contained — AI needs extension record context to orchestrate correctly (mitigated by `getPromptMeta` being the standard first step)
- v1 playbook execution logs lose detailed confidence/verification data (trade-off: simpler system)

### Migration
- Export existing playbook content from `customrecord_dz_analysis_prompt`
- Convert each playbook into one or more companion prompts with embedded meta blocks
- Create extension records for each prompt
- Keep `prompt-engine` package deployed for `detectAccountConfig`/`getAccountConfig`
- Retire playbook-specific tools (listPlaybooks, getPlaybook, createPlaybook, etc.)
- Mark v1 custom records as inactive but don't delete (audit trail)

---

## Related Documents

- `docs/discovery/atlas-ai-companion-schema-trace.md` — Oracle's bundle schema
- `docs/discovery/companion-prompt-extension-design.md` — Extension record design
- `docs/discovery/discovery-document.md` — Full discovery document
- Oracle `netsuite-ai-connector-instructions` — Agent skill system prompt

# Discovery Document — Crafted Companion

**Project:** Crafted Companion v2 — Companion-Native Intelligence for Crafted ERP
**Client:** Doozy Solutions (internal) / Crafted ERP customers
**Date:** 2026-04-14
**Author:** Luke / Claude
**Version:** 2.0
**Status:** APPROVED (revised for v2 architecture — see ADR-001)

> **v2 Architecture Note:** This document was originally written for an extension-layer approach. It has been revised to reflect the v2 ground-up redesign decision: the Crafted Intelligence Prompt Engine (v1) is being **retired entirely** and replaced by companion-native architecture built on Oracle's AI Companion framework. See `docs/specs/ADR-001-companion-native-architecture.md` for the full architecture decision record.

---

## 1. Business Context & Objectives

### 1.1 Problem Statement

Oracle's AI Companion SuiteApp provides a prompt library for NetSuite's AI Connector Service, but it ships with 100 generic finance prompts and no awareness of Crafted ERP's domain-specific data model (barrels, lots, batches, compliance, production). The record type is fully bundle-locked — no custom fields can be added, and the category list is fixed. Crafted ERP customers who deploy the AI Companion see only generic NetSuite prompts with no connection to the Crafted Intelligence toolsets they've paid for.

### 1.2 Success Criteria

1. **Customer self-service** — Crafted ERP customers open the Companion Library, see domain-specific prompts for their industry (barrels, lots, compliance), and get useful AI-powered answers without needing to know which tools exist.
2. **Edition-aware filtering** — A winery customer only sees prompts that work for winery, not distillery-specific ones like angel's share analysis. A distillery customer sees proof gallon prompts but not cellar order prompts.
3. **Adoption tracking** — Usage counters on prompts (built into Atlas) show which Crafted domains get the most AI engagement, proving value to customers and informing product investment.
4. **Tiered governance** — Prompts carry embedded governance levels (minimal → standard → governed → supervised) that guide the AI's behavior proportionally to complexity and risk, without the overhead of v1's full 13-section framework on every prompt.
5. **Partner/Oracle alignment** — Crafted prompts appear alongside Oracle's built-in prompts in the standard AI Companion UI, positioning Crafted ERP as a first-class AI-enabled ERP extension rather than a bolt-on.

### 1.3 Stakeholder Map

| Name | Role | Interest | Influence | Key Concerns |
|------|------|----------|-----------|--------------|
| Luke | Doozy Solutions — Principal | Product strategy, customer value, technical architecture | High | Prompts must be useful out of the box; extension must not break Oracle's SuiteApp |
| Crafted ERP Customers | End users | Self-service AI analytics for their operations | High | Must be simple to use; must work for their edition (distillery vs winery) |
| Oracle NetSuite | Platform vendor | AI Companion adoption, MCP ecosystem growth | Medium | Don't break the bundle; extend through supported patterns |

### 1.4 Timeline & Constraints

- **No hard deadline** — quality over speed
- **Constraint: Bundle lock** — cannot modify Oracle's record type, lists, or scripts
- **Constraint: Category list is fixed** — 7 values, all generic NetSuite. Must work within these or find workarounds.
- **Dependency: Crafted toolsets must be deployed** — companion prompts fail if their underlying Custom Tool Scripts aren't installed

---

## 2. Current-State Process Maps

### 2.1 Oracle AI Companion — Current Flow (No Crafted Extension)

```
Step | Action                              | Actor        | System              | Pain Points
-----|-------------------------------------|-------------|---------------------|------------------------------------------
1    | User opens AI Companion Suitelet    | Any NS user | NetSuite Suitelet   | —
2    | Suitelet reads user's NS role       | System      | Role Mapper Config  | Only maps generic NS roles (CFO, Controller)
3    | Queries prompts by role + category   | System      | Atlas custom record | Categories are generic (Financial, O2C, etc.)
4    | User browses by category tabs        | NS user     | Suitelet UI         | No Crafted ERP categories visible
5    | User selects a prompt                | NS user     | Suitelet UI         | Only Oracle's 100 generic prompts exist
6    | Prompt text copied to clipboard      | NS user     | Browser             | [PLACEHOLDER] markers — no guidance on what to enter
7    | User pastes into Claude/ChatGPT      | NS user     | AI assistant        | AI has no tool chain guidance, no edition context
8    | AI runs generic NS tools             | AI          | MCP Connector       | Doesn't know about Crafted tools; can't route correctly
```

**Pain Points Summary:**
- No Crafted ERP prompts visible — only generic finance/admin
- No edition awareness — distillery users see same prompts as winery users
- No tool chain guidance — AI doesn't know which Crafted tools to call
- No orchestration — AI doesn't know the optimal tool invocation order
- No artifact hints — AI doesn't know when to create dashboards vs. text responses
- No playbook escalation — no "go deeper" path for complex analysis

### 2.2 Crafted Intelligence — Current Flow (Prompt Engine, No Companion)

```
Step | Action                                | Actor        | System              | Pain Points
-----|---------------------------------------|-------------|---------------------|------------------------------------------
1    | User or AI calls listPlaybooks        | AI/Power user| MCP Connector      | Requires knowledge of Prompt Engine tools
2    | AI retrieves playbook via getPlaybook  | AI          | Custom Tool Script  | User must know playbook ID or domain
3    | AI executes multi-tool investigation   | AI          | MCP Connector       | Full governed workflow — powerful but heavy
4    | AI formats output per playbook rules   | AI          | AI assistant        | Only available to users who know about playbooks
```

**Pain Points Summary:**
- Playbooks are powerful but hidden — no click-to-run UI
- Requires knowing the Prompt Engine exists and how to invoke it
- No lightweight "quick question" path — everything is a full investigation
- No connection to Oracle's Companion Library UI

---

## 3. Requirements

### 3.1 Functional Requirements

| Req ID | Priority | Description | Acceptance Criteria | Source |
|--------|----------|-------------|---------------------|--------|
| FR-001 | MUST HAVE | Extension record (`customrecord_dz_prompt_meta`) links to Atlas companion prompts and stores tool chain, toolset, edition, params, artifact hints, playbook reference | Record created via SDF, queryable via SuiteQL JOIN to Atlas record, all 18 fields populated for barrel domain | Design doc |
| FR-002 | MUST HAVE | Extension record provides AI with full orchestration context via `getPromptMeta` (tool chain, edition, governance, params, safety rules, artifact type) | AI calls `getPromptMeta` with prompt ID, receives complete orchestration metadata, routes to correct tools | ADR-001 (revised after live test) |
| FR-003 | MUST HAVE | Companion prompts seeded for all 6 Crafted domains: barrels (12 done), lots, inventory, compliance, MRP, batch/genealogy | Prompts visible in Companion Library, tool chains execute correctly | Luke |
| FR-004 | MUST HAVE | Edition compatibility field filters prompts by account edition | Distillery account shows distillery + cross-edition prompts; winery shows winery + cross-edition; both hide incompatible prompts | Luke |
| FR-005 | MUST HAVE | `getPromptMeta` Custom Tool Script returns extension metadata for any companion prompt | AI calls getPromptMeta with prompt ID, receives tool chain, edition, params, governance level, artifact hints | Design doc |
| FR-006 | **MUST HAVE** | Tool dependency validation — **hard gate**. Prompts are hidden (not shown) if their required toolset is not deployed and connected. No soft warnings. | If barrel-intelligence toolset is not connected, barrel prompts do not appear in the Crafted Companion Library. Admin banner shows which toolsets need deployment to unlock domains. | Luke (promoted to MUST HAVE, hard validation) |
| FR-007 | SHOULD HAVE | `seedPrompt` tool creates Atlas companion prompt + extension record in one idempotent operation | Admin seeds prompts via AI; duplicates detected by externalid matching | ADR-001 |
| FR-008 | MUST HAVE | Crafted Companion Library — UIF SPA Suitelet with domain tabs, edition filtering, search, and prompt detail modals. Built with Oracle's `@uif-js/core` + `@uif-js/component` for native NetSuite look and feel. | Users open Crafted Companion Library, see prompts filtered by their edition/domain, click to view details with tool chain and governance info, copy or send to AI | Luke (promoted to MUST HAVE, Phase 1) |
| FR-009 | SHOULD HAVE | `logExecution` tool records lightweight execution data (prompt ID, tools called, success/failure, duration) | Execution history queryable via SuiteQL; replaces v1's heavy execution log | ADR-001 |
| FR-010 | NICE TO HAVE | Prompt versioning with change history | Extension record tracks version; old prompts are deprecated (status=3), new version gets new record | Design doc |

### 3.2 Non-Functional Requirements

| Req ID | Priority | Description | Acceptance Criteria |
|--------|----------|-------------|---------------------|
| NFR-001 | MUST HAVE | Extension record SuiteQL queries complete in < 2 seconds | JOIN query with 200+ prompts returns in < 2s |
| NFR-002 | MUST HAVE | `getPromptMeta` tool respects 1,000-unit governance budget | Single call uses < 50 governance units |
| NFR-003 | MUST HAVE | All SDF objects have `aidescription` on every field and record type | 100% aidescription coverage verified via SuiteQL |
| NFR-004 | SHOULD HAVE | Extension records do not affect performance of Oracle's Companion Suitelet | Oracle's Suitelet loads in same time with or without extension records in the account |
| NFR-005 | MUST HAVE | Prompt text contains only clean, user-facing content — no metadata markup | Prompt text in Companion Library shows only natural language instructions; all orchestration metadata in extension record only |

### 3.3 Integration Requirements

| Req ID | Priority | Description | Acceptance Criteria |
|--------|----------|-------------|---------------------|
| IR-001 | MUST HAVE | Extension record links to Atlas prompt via internal ID (`prompt_ref` field) | SuiteQL JOIN works: `...prompt_meta m ON m.prompt_ref = p.id` |
| IR-002 | MUST HAVE | `domain` field reuses existing `customlist_dz_ap_domain` with new values added | New domain values (Barrel Operations, Supply Chain, Quality) appear in list and are usable |
| IR-003 | MUST HAVE | v1 Prompt Engine records marked inactive but preserved for audit trail; v1 playbook tools retired | No new code references v1 Prompt Engine tools; existing playbook data queryable for historical reference |
| IR-004 | SHOULD HAVE | `detectAccountConfig` output used to determine edition compatibility at runtime | AI calls detectAccountConfig, compares editions to prompt's `edition` field, filters appropriately |

---

## 4. NetSuite Environment Assessment

### 4.1 Account Configuration

| Property | Distillery Demo (TSTDRV1912378) | Winery Demo (TSTDRV1915090) |
|----------|--------------------------------|----------------------------|
| Crafted ERP Installed | Yes | Yes |
| Active Editions | Brewery, Distillery, Winery, Non-Alcoholic | Winery |
| Multi-Subsidiary | Yes (4 subsidiaries) | TBD |
| Subsidiaries | Yacht Rock Distilling, Larimer Street Distilling, Restaurant Holdings, Crows Nest LLC | TBD |
| Uses Bins | Yes | TBD |
| Uses Lots | Yes | TBD |
| Uses Serial Numbers | Yes | TBD |
| Costing Methods | LOT, AVG, SERIAL (primary: LOT) | TBD |
| Work Orders | 1,388 | TBD |
| Barrel Management | Yes | TBD |
| TTB Enforcement | Yes | N/A |
| Compliance Active | Yes (Distillery) | TBD |
| Multi-Currency | Yes (USD, GBP, CAD, EUR) | TBD |
| Locations | 24 | TBD |
| Departments | 19 | TBD |

### 4.2 Atlas AI Companion — Current State

| Property | Value |
|----------|-------|
| Total prompts | 113 (100 Oracle + 12 Crafted barrel + 1 other) |
| Oracle SDF-seeded | 0 (flag shows F on all — may reset after reinstall) |
| Crafted prompts | 12 (barrel intelligence) |
| Categories in use | 7 (Financial=40, Visualizations=5, O2C=14, Item Mgmt=1, P2P=15, Manufacturing=12, Sys Admin=26) |
| Roles available | 14 Oracle defaults (Inventory Manager, CEO, CFO, Controller, Administrator, etc.) — **EXTENSIBLE** via `customrecord_atlas_aicomp_prompt_roles` (custom record, not locked list). Crafted-specific roles can be created. |
| Industries available | 39 (including Food and Beverage=17) |
| Scripts | 7 (Suitelet library, Record locking UE, Role mapper config, SDF install x2, Scheduled sync, Usage rollup) |
| Usage rollup | NOT SCHEDULED — deployed but not running |

### 4.3 Crafted Intelligence Toolsets — Prompt Coverage Plan

| Toolset | Package | Tools | Edition | Prompts Planned | Prompts Seeded |
|---------|---------|-------|---------|----------------|----------------|
| Barrel Intelligence | barrel-intelligence | 8 | Cross | 12-14 | 12 |
| Lot Profitability | lot-profitability | 7 | Distillery | 10-15 | 0 |
| Inventory & Supply | inventory-supply | 9 | Distillery | 15-20 | 0 |
| Compliance & Audit | compliance-audit | 8 | Distillery | 10-15 | 0 |
| MRP Intelligence | mrp-intelligence | 6 | Cross | 8-12 | 0 |
| Batch & Genealogy | batch-genealogy | 3 | Winery | 5-8 | 0 |
| Prompt Engine | prompt-engine | 2 (retained) | Cross | N/A | N/A |
| Companion Tools | crafted-companion | 4 (new) | Cross | N/A | N/A |
| **Total** | | **47 data + 6 companion** | | **60-84** | **12** |

> **v2 Note:** Prompt Engine shrinks from 12 tools to 2 retained (`detectAccountConfig`, `getAccountConfig`). 10 playbook tools are retired. 4 new companion tools (`getPromptMeta`, `seedPrompt`, `updatePrompt`, `logExecution`) replace them. See ADR-001 for the full concept migration map.

### 4.4 Existing Crafted Custom Records (Relevant)

| Record Type | Package | Purpose | v2 Status |
|-------------|---------|---------|-----------|
| `customrecord_dz_analysis_prompt` | prompt-engine | Playbook master | **RETIRE** — replaced by Atlas companion prompts + meta blocks |
| `customrecord_dz_ap_section` | prompt-engine | Playbook section | **RETIRE** — replaced by meta block `steps:` array |
| `customrecord_dz_ap_shared_sec` | prompt-engine | Shared sections | **RETIRE** — replaced by reference files in `prompts/` |
| `customrecord_dz_ap_exec_log` | prompt-engine | Execution log | **RETIRE** — replaced by simplified `customrecord_dz_exec_log` |
| `customrecord_dz_intel_config` | prompt-engine | Account config | **KEEP** — critical for edition detection |
| `customrecord_dz_brand_profile` | prompt-engine | Brand identity | **KEEP** — artifact styling with Redwood token overrides |
| `customlist_dz_ap_domain` | prompt-engine | Domain enum | **KEEP** — shared by extension record `domain` field |

---

## 5. Gap Analysis

| Gap ID | Current State | Future State | Gap Description | Resolution | Effort |
|--------|--------------|-------------|----------------|------------|--------|
| G-001 | Atlas prompt record has no tool chain metadata | Every Crafted prompt has tool chain, toolset, entry tool | No field extensibility on bundle-locked record | Extension record + embedded meta block | M |
| G-002 | No edition awareness — all prompts visible to all users | Prompts filtered by account edition | No edition field on Atlas record | Extension record `edition` field + runtime `detectAccountConfig` check | M |
| G-003 | Category list is fixed (7 generic values) | Crafted domains have their own categories | Bundle-locked list, cannot add values | Use Manufacturing (6) for all Crafted prompts; subcategory (free text) for domain tagging; extension record `domain` field for real filtering | S |
| G-004 | AI gets prompt text with no orchestration guidance | AI knows tool chain, parameters, artifact type | Prompt text is just natural language | Extension record carries all orchestration metadata; AI calls `getPromptMeta` as first step | S |
| G-005 | v1 Prompt Engine runs as a parallel shadow system invisible to Companion UI | Single prompt delivery mechanism through Oracle's Companion framework | Two systems (Prompt Engine + Companion) doing the same job | **Retire v1 Prompt Engine entirely.** Migrate playbook content into companion prompts with embedded meta blocks. Retain only `detectAccountConfig`/`getAccountConfig` from v1. See ADR-001. | L |
| G-006 | No tool availability validation | Prompts **hidden** if required tools are missing (hard gate) | MCP connector doesn't expose tool inventory to SuiteQL | SPA uses `detectAccountConfig` + extension record `tool_deps` field to determine which toolsets are deployed. Prompts with undeployed toolsets are not rendered. Admin banner shows what's missing. | M |
| G-007 | Only 14 AI Companion roles — no Crafted-specific roles (Distiller, Cellar Master) | Crafted-specific roles created and assigned to prompts | ~~Role list is bundle-locked~~ **RESOLVED (2026-04-14):** Roles are a custom record type (`customrecord_atlas_aicomp_prompt_roles`), NOT a locked list. New roles can be created via Prompt Studio "+" button or `ns_createRecord`. | Create Crafted-specific roles (Distiller, Cellar Master, Production Manager, etc.) and assign to domain-specific prompts. | S |
| G-008 | Oracle Companion Suitelet shows all prompts with no domain filtering | Crafted-branded view with edition + domain filters | Suitelet is bundle-locked, can't modify | **Phase 1: UIF SPA Suitelet** with domain tabs, edition filtering, search, prompt detail modals. Built with Oracle's own UIF component framework. | L |
| G-009 | No prompt versioning — updates are in-place | Version tracking with deprecation workflow | Atlas record has no version field | Extension record `version` + `status` fields; old versions deprecated, new versions get new extension records | S |

---

## 6. Risk Register

| Risk ID | Description | Probability | Impact | Severity | Mitigation | Owner |
|---------|------------|-------------|--------|----------|-----------|-------|
| R-001 | Oracle updates AI Companion SuiteApp and changes schema or adds fields that conflict with our extension | Low | High | Medium | Extension record is linked by ID, not structurally dependent. Embedded meta block is an HTML comment — invisible to Oracle's code. Monitor Oracle release notes. | Luke |
| R-002 | Bundle-locked category list limits discoverability — users can't filter by "Barrel Operations" in Oracle's UI | High | Medium | Medium | Use subcategory free text for domain labeling. Build Crafted Companion Suitelet (Phase 2) with proper domain filtering. Embedded meta block gives AI runtime context regardless. | Luke |
| R-003 | ~~Embedded meta block visibility~~ **RESOLVED (2026-04-14):** Live test confirmed HTML comments ARE visible in Companion Library. Decision: no embedded metadata in prompt text. All orchestration via extension record + `getPromptMeta`. Risk eliminated. | N/A | N/A | N/A | Resolved by design change. | Luke |
| R-004 | Prompt text size limit on Atlas record — embedded meta block + prompt text exceeds field capacity | Low | Medium | Low | Atlas `prompt_text` is Long Text (unlimited in NetSuite custom records). Meta block adds ~200-400 bytes. No practical risk. | Luke |
| R-005 | Crafted toolsets not deployed in customer account — companion prompts fail silently | Medium | High | High | `getPromptMeta` validates tool dependencies. FR-006 (tool validation) catches this at prompt selection time. Clear prerequisite documentation per domain. | Luke |
| R-006 | External ID collisions between Oracle seeded prompts and Crafted prompts | Low | High | Medium | Oracle uses `aiprompt_111`–`aiprompt_210`. Crafted uses `aiprompt_crafted_[domain]_NNN`. Separate namespaces prevent collision. | Luke |
| R-007 | Extension record JOIN performance degrades with large prompt count (500+) | Low | Medium | Low | Extension record has integer FK to Atlas record. Index on `prompt_ref` field. Query with ROWNUM limit. At current scale (113 prompts → ~200 with all domains) this is not a concern. | Luke |
| R-008 | ~~Role mapping gap~~ **RESOLVED (2026-04-14):** Roles are extensible (`customrecord_atlas_aicomp_prompt_roles` is a custom record, not a locked list). We can create Crafted-specific roles directly. | N/A | N/A | N/A | Resolved — create Crafted roles via `ns_createRecord` or Prompt Studio. No mapping needed. | Luke |

---

## 7. Assumptions & Open Questions

### Assumptions

| ID | Assumption | Impact if Wrong |
|----|-----------|----------------|
| A-001 | Oracle will not remove or restructure `customrecord_atlas_aicomp_prompts` in near-term SuiteApp updates | Extension record FK breaks; need migration script to re-link |
| A-002 | ~~HTML comments in prompt text are invisible in Oracle's Companion Suitelet UI~~ **DISPROVEN (2026-04-14):** Live test confirmed Companion Library renders prompt text as plain text — HTML comments are displayed verbatim. **Resolution:** All metadata moved to extension record; prompt text stays clean. |
| A-003 | `customlist_dz_ap_domain` can be extended with new values without breaking existing playbooks | Playbooks using domain filter may need updating if list value IDs shift |
| A-004 | All Crafted toolsets will be deployed to customer accounts before companion prompts are enabled | Prompts that reference undeployed tools will fail at runtime |
| A-005 | MCP connector reliably caches tool inventory and can be programmatically queried for tool availability | If not, tool validation (FR-006) falls back to try-catch at execution time |

### Open Design Questions

| ID | Question | Recommendation | Status |
|----|---------|---------------|--------|
| OQ-001 | **Custom Suitelet wrapper?** Build a Crafted-branded Suitelet that wraps Oracle's Companion Library with edition filtering and Crafted metadata? | **Phase 1 — UIF SPA Suitelet.** Build with Oracle's `@uif-js/core` + `@uif-js/component` for native look and feel. Domain tabs, edition filtering (powered by `detectAccountConfig`), search, prompt detail modals with tool chain preview, governance badges, and action buttons. Oracle's UIF type definitions and agent-skills reference downloaded to `docs/oracle-agent-skills/`. | **RESOLVED** |
| OQ-002 | **Tool validation at prompt selection time?** Verify all required tools are deployed and connected before showing a prompt? | **HARD validation.** Prompts are **hidden** if their required toolset is not deployed/connected. The SPA checks tool availability via `detectAccountConfig` and the extension record's `tool_deps` field. No soft warnings — if the tools aren't there, the prompt doesn't appear. An admin banner shows which toolsets need deployment to unlock additional domains. | **RESOLVED** |
| OQ-003 | **Prompt Studio parameter UI?** Does Oracle's Prompt Studio support structured parameter input or only free text `[BRACKET]` replacement? | **Plain text only.** Live test confirmed Prompt Studio is a standard form with a plain text area. `[BRACKET]` placeholders are just text, not structured input fields. `params` schema in extension record is advisory for the AI — it uses it to validate user input and provide hints. | **RESOLVED** |
| OQ-004 | **Versioning strategy?** New Atlas record per version, or update in place? | **Update in place.** Atlas prompt record updated directly (same ID/externalID). Extension record's `version` field tracks semantic version (1.0.0 → 1.1.0 → 2.0.0). `logExecution` records which version was running at execution time. No duplicate prompt records. Phase 2 can add a version history sub-record if full audit trail is needed. | **RESOLVED** |

---

## 8. Next Steps

- [x] **v2 Architecture Decision** — ADR-001 written, capturing ground-up redesign and Prompt Engine retirement
- [x] **Project CLAUDE.md updated** — rewritten for v2 companion-native framing
- [x] **Discovery document revised** — updated requirements, gaps, and toolset plan for v2
- [ ] **Luke reviews ADR-001** — approve or redirect the v2 architecture before proceeding
- [x] **OQ-001 resolved** — UIF SPA Suitelet as Phase 1 deliverable
- [x] **OQ-002 resolved** — Hard tool validation (prompts hidden if toolset not deployed)
- [x] **OQ-003 resolved** — Prompt Studio is plain text; params schema is advisory for AI
- [x] **A-002 disproven** — HTML comments visible; embedded meta block abandoned
- [x] **OQ-004 resolved** — Update in place; version tracked on extension record
- [x] **HITM approval** — Luke approves discovery document + ADR-001 to advance to Scoping phase
- [ ] **Run `/scope`** — define deliverables, effort estimates, Phase 1 vs Phase 2 boundary, and v1 retirement plan

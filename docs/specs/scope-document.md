# Scope Document — Crafted Companion v2

**Project:** Crafted Companion v2 — Companion-Native Intelligence for Crafted ERP
**Client:** Doozy Solutions (internal) / Crafted ERP customers
**Date:** 2026-04-14
**Author:** Luke / Claude
**Version:** 1.0
**Status:** DRAFT
**Discovery Reference:** `docs/discovery/discovery-document.md` (v2.0, APPROVED)
**Architecture Reference:** `docs/specs/ADR-001-companion-native-architecture.md` (APPROVED)

---

## 1. Executive Summary

Crafted Companion v2 retires the Crafted Intelligence Prompt Engine (v1) and rebuilds the entire intelligence delivery layer natively on Oracle's AI Companion framework. The v1 system ran as a parallel shadow system — invisible to Oracle's Companion Library, requiring users to know about proprietary tools to access prompts. v2 eliminates that: Crafted prompts appear natively in Oracle's Companion Library, and a custom Crafted Companion Library SPA provides domain/edition filtering that Oracle's UI lacks.

The project delivers four major components: (1) SDF custom objects — an extension record linking to Atlas prompts with full orchestration metadata, execution log, and supporting custom lists; (2) a companion toolset — 4 new Custom Tool Scripts (`getPromptMeta`, `seedPrompt`, `updatePrompt`, `logExecution`) replacing 10 retired Prompt Engine tools; (3) a UIF SPA Suitelet — a Crafted Companion Library built with Oracle's `@uif-js/core` + `@uif-js/component` for native look and feel, with domain tabs, edition filtering, hard tool validation, and governance badges; (4) companion prompts seeded across all 6 Crafted domains (~60-84 prompts) with extension records.

The scope is split into two phases. Phase 1 delivers the foundation: SDF objects, companion toolset, SPA Suitelet, barrel domain extension records, and v1 retirement. Phase 2 seeds prompts for the remaining 5 domains and adds polish features. Phase 1 is the minimum viable product; Phase 2 is expansion.

---

## 2. Scope Boundary

### 2.1 In Scope (Phase 1 — MVP)

- **SDF Custom Objects:** Extension record (`customrecord_dz_prompt_meta`, ~20 fields), execution log (`customrecord_dz_exec_log`), 3 custom lists (`customlist_dz_pm_edition`, `customlist_dz_pm_complexity`, `customlist_dz_pm_status`). Full SDF XML with `aidescription` on every field and value.
- **Companion Toolset (4 tools):** `getPromptMeta` (read orchestration metadata), `seedPrompt` (create Atlas prompt + extension record), `updatePrompt` (update prompt + extension metadata), `logExecution` (lightweight execution log). All built as Custom Tool Scripts in a new `crafted-companion` toolset with both expose flags.
- **UIF SPA Suitelet:** Crafted Companion Library with domain tabs (TabPanel), edition filtering (FilterPanel + detectAccountConfig), search (TextBox), prompt detail modals (Modal), governance badges (Badge), tool chain preview, hard tool validation (prompts hidden if toolset not deployed). Backend Suitelet serves SPA + REST API.
- **Barrel Domain Extension Records:** Create `customrecord_dz_prompt_meta` records for all 12 existing barrel intelligence prompts. Full orchestration metadata: tool chain, steps JSON, safety rules, params, governance level, edition, artifact type.
- **v1 Prompt Engine Retirement:** Mark all v1 custom records as inactive (playbooks, sections, shared sections, execution log). Remove v1 playbook tools from active toolset. Retain `detectAccountConfig` and `getAccountConfig`.
- **Documentation:** Technical Design Specification (TDS) for extension record + toolset + SPA. Admin guide for prompt management. Deployment runbook.
- **Deployment:** SDF deploy to TSTDRV1912378 (distillery demo) + TSTDRV1915090 (winery demo for cross-edition validation).

### 2.2 In Scope (Phase 2 — Expansion)

- **Domain Prompt Seeding:** Create companion prompts + extension records for remaining 5 domains: Lot Profitability (~10-15 prompts), Inventory & Supply (~15-20), Compliance & Audit (~10-15), MRP Intelligence (~8-12), Batch & Genealogy (~5-8, Winery edition).
- **Prompt Definition Documents:** Write prompt definition docs for each domain (like `prompts/barrel-intelligence/barrel-intelligence-prompts.md`).
- **End-User KB Articles:** Crafted Companion Library user guide for Zendesk Help Center.
- **Usage Analytics Dashboard:** SuiteQL-based reporting on prompt execution counts, tool invocation patterns, adoption by domain.

### 2.3 Out of Scope (Explicit Exclusions)

- **Modifying Oracle's Companion Library Suitelet** — Bundle-locked, cannot be changed.
- ~~**Custom AI Companion roles**~~ **MOVED TO IN SCOPE (P-001a):** Roles are extensible (`customrecord_atlas_aicomp_prompt_roles` is a custom record type). Crafted-specific roles will be created in Phase 1.
- **Custom AI Companion categories** — Category list is bundle-locked (7 values). We use Manufacturing (6) + subcategory free text.
- **Prompt version history sub-records** — Versioning is update-in-place with a `version` field. No version history child records.
- **Client-facing customization UI** — Clients do not create their own prompts in Phase 1. Prompts are seeded by Doozy.
- **ChatGPT-specific integration** — Prompts work with any MCP-compatible AI. No ChatGPT-specific UI or features.
- **Oracle Companion Usage Rollup scheduling** — The `atlas_aicomp` usage rollup scheduled script is deployed but not scheduled. We do not enable or configure it.
- **Data layer changes** — No modifications to existing Custom Tool Scripts (barrel-intelligence, lot-profitability, etc.). The data layer is retained as-is.
- **Production account deployment** — All work is in sandbox environments. Production deployment requires a separate change request.
- **MRP Engine integration** — MRP Engine is in its own repo. MRP prompts (Phase 2) will reference those tools but no code changes to the MRP package.

### 2.4 Deferred Items (Future Phase Candidates)

- **Version history sub-record** — Track full change history per prompt (Phase 3+).
- **Client prompt authoring** — Allow clients to create their own companion prompts via the SPA (Phase 3+).
- **Prompt marketplace** — Share prompts between Crafted ERP customers (Phase 3+).
- **Prompt performance scoring** — Track which prompts produce the best user outcomes (Phase 3+).
- **SPA dark mode / theme customization** — Redwood tokens only in Phase 1 (Phase 3+).
- **Prompt dependencies / chaining** — Run multiple prompts in sequence (Phase 3+).

---

## 3. Deliverables

### 3.1 Custom Tool Scripts

| Del ID | Tool | Type | Toolset | Purpose | Complexity |
|--------|------|------|---------|---------|------------|
| T-001 | `getPromptMeta` | Custom Tool Script | crafted-companion | Read extension record metadata for a companion prompt. Returns tool chain, edition, params, governance, safety rules, artifact hints. | M |
| T-002 | `seedPrompt` | Custom Tool Script | crafted-companion | Create Atlas companion prompt + extension record in one idempotent operation. Duplicate detection via externalid. | L |
| T-003 | `updatePrompt` | Custom Tool Script | crafted-companion | Update Atlas prompt text and/or extension record fields. Version bump on extension record. | M |
| T-004 | `logExecution` | Custom Tool Script | crafted-companion | Lightweight execution log — prompt ID, tools called, success/failure, duration, version. | S |

### 3.2 SDF Custom Objects

| Del ID | Type | Script ID | Fields | Purpose |
|--------|------|-----------|--------|---------|
| O-001 | Custom Record | `customrecord_dz_prompt_meta` | ~20 | Extension record linking to Atlas prompt. Stores domain, toolset, tool chain, steps, edition, params, safety rules, governance, artifact, version, status. |
| O-002 | Custom Record | `customrecord_dz_exec_log` | ~8 | Lightweight execution log. Prompt ID, timestamp, tools called, success/failure, duration, version. |
| O-003 | Custom List | `customlist_dz_pm_edition` | 4 values | Distillery, Winery, Brewery, Cross-Edition |
| O-004 | Custom List | `customlist_dz_pm_complexity` | 4 values | Minimal, Standard, Governed, Supervised |
| O-005 | Custom List | `customlist_dz_pm_status` | 4 values | Active, Draft, Deprecated, Testing |
| O-006 | Toolset XML | `custtoolset_crafted_companion` | — | Toolset definition with both expose flags. Contains T-001 through T-004. |

### 3.3 UIF SPA Suitelet

| Del ID | Component | Framework | Purpose | Complexity |
|--------|-----------|-----------|---------|------------|
| SPA-001 | Backend Suitelet | SuiteScript 2.x | Serves SPA shell on GET; REST API on POST (queries Atlas prompts JOIN extension records). | L |
| SPA-002 | SPA Entry Point (`app.js`) | UIF `@uif-js/core` | Root component, router, app shell with ApplicationHeader. | M |
| SPA-003 | Store + Reducer | UIF `@uif-js/core` | State management: filter state, search query, loaded prompts, tool availability cache. | M |
| SPA-004 | API Module (`api.js`) | UIF `Ajax` | Ajax calls to Suitelet backend for prompt data, tool availability checks. | S |
| SPA-005 | TabPanel (Domain Tabs) | UIF `@uif-js/component` | Tabs for each Crafted domain: Barrel Operations, Lot Profitability, Inventory & Supply, etc. | M |
| SPA-006 | FilterPanel + FilterChip | UIF `@uif-js/component` | Edition filter (distillery/winery/brewery/cross), governance level filter. Hard tool validation: domains with undeployed toolsets are hidden. | M |
| SPA-007 | Card Grid | UIF `@uif-js/component` | Prompt cards in grid layout. Name, domain, governance badge, tool count, status pill. | M |
| SPA-008 | Prompt Detail Modal | UIF `@uif-js/component` | Full prompt detail: text, tool chain diagram, params, safety rules, governance level, version, actions (Copy, Send to Claude). | L |
| SPA-009 | Search | UIF `@uif-js/component` | TextBox with client-side search across prompt name, text, tool names. | S |
| SPA-010 | Admin Banner | UIF `@uif-js/component` | Shows which toolsets need deployment to unlock additional domains. Only visible when some domains are hidden. | S |

### 3.4 Prompt Extension Records (Phase 1 — Barrel Domain)

| Del ID | Prompts | Domain | Description |
|--------|---------|--------|-------------|
| P-001 | 12 records | Barrel Intelligence | Create `customrecord_dz_prompt_meta` records for all 12 existing barrel prompts (IDs 101-109, 201-203). Full orchestration: tool chain, steps JSON, safety rules, params, governance, edition, artifact type. |
| P-001a | ~5-8 roles | Crafted Roles | Create Crafted-specific roles in `customrecord_atlas_aicomp_prompt_roles` (e.g., Distiller, Cellar Master, Production Manager, Winemaker). Assign to domain-specific prompts. |

### 3.5 v1 Retirement

| Del ID | Action | Records Affected | Description |
|--------|--------|------------------|-------------|
| R-001 | Mark inactive | `customrecord_dz_analysis_prompt` | Set `isinactive=T` on all playbook records |
| R-002 | Mark inactive | `customrecord_dz_ap_section` | Set `isinactive=T` on all section records |
| R-003 | Mark inactive | `customrecord_dz_ap_shared_sec` | Set `isinactive=T` on all shared section records |
| R-004 | Mark inactive | `customrecord_dz_ap_exec_log` | Set `isinactive=T` on all old execution log records |
| R-005 | Retire tools | prompt-engine toolset | Remove 10 playbook tools from active toolset. Retain `detectAccountConfig`, `getAccountConfig`. |

### 3.6 Documentation

| Del ID | Document | Audience | Purpose |
|--------|----------|----------|---------|
| D-001 | Technical Design Spec (TDS) | Technical team | Extension record schema, toolset architecture, SPA design, SuiteQL queries, deployment procedures |
| D-002 | Admin Guide | NetSuite admin | Prompt management: seeding, updating, monitoring. Extension record field reference. SPA configuration. |
| D-003 | Deployment Runbook | Technical team | Step-by-step SDF deploy, MCP reconnect, smoke test checklist, rollback procedures |

### 3.7 Prompt Seeding — Phase 2

| Del ID | Prompts | Domain | Edition | Tool Count |
|--------|---------|--------|---------|------------|
| P-002 | ~10-15 | Lot Profitability | Distillery | 7 |
| P-003 | ~15-20 | Inventory & Supply | Distillery | 9 |
| P-004 | ~10-15 | Compliance & Audit | Distillery | 8 |
| P-005 | ~8-12 | MRP Intelligence | Cross | 6 |
| P-006 | ~5-8 | Batch & Genealogy | Winery | 3 |

---

## 4. Effort Estimate

### 4.1 Phase 1 — Deliverable Estimates

| Del ID | Description | Size | Dev Hours | Test Hours | Doc Hours | Total |
|--------|-------------|------|-----------|------------|-----------|-------|
| **Custom Objects** | | | | | | |
| O-001 | Extension record XML (20 fields, aidescriptions) | M | 6 | 2 | 1 | 9 |
| O-002 | Execution log XML (8 fields) | S | 3 | 1 | 0.5 | 4.5 |
| O-003 | Edition list XML | XS | 1 | 0.5 | 0 | 1.5 |
| O-004 | Complexity list XML | XS | 1 | 0.5 | 0 | 1.5 |
| O-005 | Status list XML | XS | 1 | 0.5 | 0 | 1.5 |
| O-006 | Toolset XML | XS | 1 | 0.5 | 0 | 1.5 |
| **Tool Scripts** | | | | | | |
| T-001 | getPromptMeta | M | 6 | 3 | 1 | 10 |
| T-002 | seedPrompt | L | 12 | 5 | 1.5 | 18.5 |
| T-003 | updatePrompt | M | 6 | 3 | 1 | 10 |
| T-004 | logExecution | S | 3 | 1.5 | 0.5 | 5 |
| **UIF SPA** | | | | | | |
| SPA-001 | Backend Suitelet | L | 12 | 4 | 1 | 17 |
| SPA-002 | SPA Entry Point | M | 6 | 2 | 0.5 | 8.5 |
| SPA-003 | Store + Reducer | M | 6 | 3 | 0.5 | 9.5 |
| SPA-004 | API Module | S | 3 | 1.5 | 0.5 | 5 |
| SPA-005 | Domain Tabs | M | 6 | 2 | 0.5 | 8.5 |
| SPA-006 | Filter Panel + Tool Validation | M | 8 | 3 | 0.5 | 11.5 |
| SPA-007 | Card Grid | M | 6 | 2 | 0.5 | 8.5 |
| SPA-008 | Prompt Detail Modal | L | 10 | 4 | 0.5 | 14.5 |
| SPA-009 | Search | S | 3 | 1.5 | 0.5 | 5 |
| SPA-010 | Admin Banner | S | 2 | 1 | 0 | 3 |
| **Extension Records** | | | | | | |
| P-001 | Barrel domain (12 prompts) | M | 6 | 3 | 1 | 10 |
| **v1 Retirement** | | | | | | |
| R-001–R-005 | Retire records + tools | S | 3 | 2 | 0.5 | 5.5 |
| **Documentation** | | | | | | |
| D-001 | TDS | M | — | — | 8 | 8 |
| D-002 | Admin Guide | S | — | — | 4 | 4 |
| D-003 | Deployment Runbook | S | — | — | 3 | 3 |
| | **Phase 1 Subtotal** | | **110** | **45.5** | **27** | **182.5** |

### 4.2 Phase 2 — Deliverable Estimates

| Del ID | Description | Size | Dev Hours | Test Hours | Doc Hours | Total |
|--------|-------------|------|-----------|------------|-----------|-------|
| P-002 | Lot Profitability prompts (~12) + extension records | M | 8 | 4 | 3 | 15 |
| P-003 | Inventory & Supply prompts (~17) + extension records | L | 12 | 5 | 4 | 21 |
| P-004 | Compliance & Audit prompts (~12) + extension records | M | 8 | 4 | 3 | 15 |
| P-005 | MRP Intelligence prompts (~10) + extension records | M | 6 | 3 | 3 | 12 |
| P-006 | Batch & Genealogy prompts (~6) + extension records | S | 4 | 2 | 2 | 8 |
| D-004 | End-user KB articles | M | — | — | 8 | 8 |
| D-005 | Usage analytics queries | S | 3 | 1.5 | 1 | 5.5 |
| | **Phase 2 Subtotal** | | **41** | **19.5** | **24** | **84.5** |

### 4.3 Phase Summary

| Phase | Dev Hours | Test Hours | Doc Hours | Subtotal |
|-------|-----------|------------|-----------|----------|
| Phase 1 (MVP) | 110 | 45.5 | 27 | 182.5 |
| Phase 2 (Expansion) | 41 | 19.5 | 24 | 84.5 |
| **Development Subtotal** | **151** | **65** | **51** | **267** |
| Planning & Design (15%) | | | | 40 |
| UAT Support (15%) | | | | 40 |
| Deployment & Stabilization (10%) | | | | 27 |
| Project Management (15%) | | | | 56 |
| **Pre-Buffer Total** | | | | **430** |
| Risk Buffer (20% — medium complexity) | | | | 86 |
| **Total Estimated Hours** | | | | **516** |

**Phase 1 alone (with multipliers):**

| Component | Hours |
|-----------|-------|
| Phase 1 Development Subtotal | 182.5 |
| Planning & Design (15%) | 27 |
| UAT Support (15%) | 27 |
| Deployment & Stabilization (10%) | 18 |
| Project Management (15%) | 38 |
| **Pre-Buffer** | **292.5** |
| Risk Buffer (20%) | 59 |
| **Phase 1 Total** | **~352 hours** |

---

## 5. Timeline

### Phase 1 — MVP (Weeks 1-8)

```
WEEK 1-2: PLANNING & DESIGN
├── Write TDS (extension record schema, tool signatures, SPA wireframes)
├── Write SDF XML for all custom objects (O-001 through O-006)
├── SDF deploy to sandbox → verify records/lists exist and are queryable
└── GATE: HITM approval of TDS + SDF objects deployed

WEEK 3-4: COMPANION TOOLSET
├── Sprint 1: getPromptMeta (T-001) + logExecution (T-004)
│   ├── Tool script + JSON schema + toolset XML
│   ├── Unit test: query extension record, validate response shape
│   └── Deploy to sandbox, reconnect MCP, test via AI Connector
├── Sprint 2: seedPrompt (T-002) + updatePrompt (T-003)
│   ├── Tool scripts with idempotency (externalid matching)
│   ├── Unit test: create, duplicate detection, update, version bump
│   └── Deploy to sandbox, reconnect MCP, test via AI Connector
└── GATE: All 4 tools deployed and working via MCP

WEEK 4-5: BARREL EXTENSION RECORDS + V1 RETIREMENT
├── Create 12 extension records for barrel prompts (P-001)
│   ├── Full orchestration: tool chain, steps JSON, safety rules, params
│   └── Test: getPromptMeta returns correct data for each barrel prompt
├── Execute v1 retirement (R-001 through R-005)
│   ├── Mark playbook records inactive
│   └── Retire 10 prompt engine tools
└── GATE: Barrel domain fully orchestrated via getPromptMeta

WEEK 5-7: UIF SPA SUITELET
├── Sprint 1: Backend Suitelet (SPA-001) + API module (SPA-004) + Store (SPA-003)
│   ├── GET serves SPA shell, POST returns prompt data as JSON
│   ├── SuiteQL: Atlas prompts JOIN extension records
│   └── Test: API returns correct prompt list with extension metadata
├── Sprint 2: App shell (SPA-002) + Tabs (SPA-005) + Cards (SPA-007) + Search (SPA-009)
│   ├── Domain tabs populated from API data
│   ├── Card grid with governance badges, tool count
│   └── Client-side search across name/text/tools
├── Sprint 3: Filters (SPA-006) + Modal (SPA-008) + Banner (SPA-010)
│   ├── Edition filter (detectAccountConfig integration)
│   ├── Hard tool validation: hide domains with undeployed toolsets
│   ├── Prompt detail modal with tool chain, params, actions
│   └── Admin banner for missing toolsets
└── GATE: SPA fully functional in sandbox

WEEK 7-8: TESTING & DOCUMENTATION
├── Integration testing: full flow (SPA → getPromptMeta → tool execution → logExecution)
├── Cross-edition testing: deploy to winery sandbox, verify edition filtering
├── Admin guide (D-002) + deployment runbook (D-003)
├── Bug fixes and polish
└── GATE: Phase 1 complete — HITM sign-off
```

### Phase 2 — Expansion (Weeks 9-12)

```
WEEK 9-10: PROMPT AUTHORING
├── Write prompt definition docs for each remaining domain
├── Seed companion prompts for Lot Profitability (P-002) + Inventory & Supply (P-003)
├── Create extension records with full orchestration metadata
└── Test: getPromptMeta + tool execution for each prompt

WEEK 11-12: REMAINING DOMAINS + DOCS
├── Seed Compliance & Audit (P-004) + MRP Intelligence (P-005) + Batch & Genealogy (P-006)
├── Cross-edition validation for winery-specific prompts (P-006)
├── End-user KB articles (D-004) + usage analytics queries (D-005)
└── GATE: All domains seeded — Phase 2 complete — HITM sign-off
```

### Critical Path

```
SDF Objects → getPromptMeta → seedPrompt → Barrel Extension Records → SPA Backend → SPA Frontend
                                                                            ↑
                                                                    (blocks all SPA work)
```

The critical path runs through the Backend Suitelet (SPA-001), since all SPA components depend on its REST API. The companion toolset must be functional before extension records can be created, and extension records must exist before the SPA has data to display.

---

## 6. Assumptions & Constraints

### Scoping Assumptions

| ID | Assumption | Impact if Wrong |
|----|-----------|----------------|
| SA-01 | Oracle will not change the `customrecord_atlas_aicomp_prompts` schema during the project timeline | Extension record FK breaks; need migration script |
| SA-02 | Both sandbox environments (TSTDRV1912378, TSTDRV1915090) remain available and accessible | Delays testing; need alternative environment |
| SA-03 | The UIF SPA framework (`@uif-js/core`, `@uif-js/component`) is available in NetSuite 2025.2 sandboxes | SPA must be rebuilt as traditional Suitelet; significant rework |
| SA-04 | `detectAccountConfig` correctly identifies which toolsets are deployed for tool validation | Hard validation may incorrectly hide prompts; need fallback logic |
| SA-05 | Total prompt count stays under 300 (113 existing + ~84 Crafted) — SPA performance is tuned for this scale | May need pagination or lazy loading |
| SA-06 | All 53 existing Custom Tool Scripts continue to work without modification | Data layer bugs would surface as prompt execution failures |
| SA-07 | MCP connector caches tool inventory and can be queried/inferred for tool availability | Tool validation falls back to try-catch at execution time |

### Constraints

- **ES5 only** — All SuiteScript must be ES5 (no async/await, const/let, arrow functions, template literals)
- **Bundle lock** — Cannot modify Oracle's AI Companion record type, custom lists, or scripts
- **Category limit** — Only 7 fixed categories available; all Crafted prompts use Manufacturing (6)
- **Governance budget** — 1,000 units per tool invocation; `getPromptMeta` must stay under 50 units
- **No production deployment** — All work in sandbox environments; production requires separate change request
- **MCP reconnect required** — After every tool deployment, the MCP connector must be disconnected/reconnected

---

## 7. Risks

### Carried Forward from Discovery

| Risk ID | Description | Probability | Impact | Severity | Mitigation |
|---------|------------|-------------|--------|----------|-----------|
| R-001 | Oracle updates AI Companion SuiteApp and changes schema | Low | High | Medium | Extension record linked by ID, not structurally dependent. Monitor Oracle release notes. |
| R-005 | Crafted toolsets not deployed in customer account — prompts fail | Medium | High | High | Hard tool validation in SPA (OQ-002 resolved). Prompts hidden if toolset not deployed. Admin banner shows what's missing. |
| R-006 | External ID collisions between Oracle and Crafted prompts | Low | High | Medium | Separate namespaces: Oracle uses `aiprompt_111`–`aiprompt_210`, Crafted uses `aiprompt_crafted_[domain]_NNN`. |
| R-008 | ~~Role mapping gap~~ **RESOLVED:** Roles are extensible (`customrecord_atlas_aicomp_prompt_roles` is a custom record). Crafted-specific roles can be created directly. | N/A | N/A | N/A | Resolved — no mapping needed. |

### New Scope-Specific Risks

| Risk ID | Description | Probability | Impact | Severity | Mitigation |
|---------|------------|-------------|--------|----------|-----------|
| R-009 | UIF SPA framework has undocumented limitations or bugs in sandbox | Medium | High | High | Oracle's UIF type definitions downloaded locally. Start SPA early (Week 5) to surface issues. Fallback: traditional Suitelet with client-side JS. |
| R-010 | `seedPrompt` idempotency fails — duplicate prompts created | Low | Medium | Medium | Externalid matching + pre-check SuiteQL query. Idempotency tested in Sprint 2. |
| R-011 | Extension record SuiteQL JOIN performance degrades with prompt count | Low | Medium | Low | FK indexed. At current scale (200 prompts) this is negligible. Add ROWNUM limit. |
| R-012 | Hard tool validation hides too many prompts in accounts with partial toolset deployment | Medium | Medium | Medium | Admin banner explicitly shows which toolsets to deploy. SPA shows count of "hidden" prompts per domain so admin knows they exist. |
| R-013 | SPA development takes longer than estimated due to UIF learning curve | Medium | Medium | Medium | 20% risk buffer applied. Oracle reference files downloaded. Start with simplest components first. |

---

## 8. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Project Lead / HITM | Luke | | Pending |
| Technical Architect | Claude | 2026-04-14 | Drafted |

---

## 9. Change Control

Any changes to this scope require:
1. Written change request with impact assessment (hours + timeline delta)
2. Effort re-estimation for affected deliverables
3. HITM approval before implementation
4. Updated scope document version
5. Change logged in `audit-trail/change_log.md`

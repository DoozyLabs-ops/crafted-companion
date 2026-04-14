# Task Plan — Crafted Companion v2

**Scope Reference:** `docs/specs/scope-document.md` (APPROVED)
**Architecture Reference:** `docs/specs/ADR-001-companion-native-architecture.md` (APPROVED)
**Created:** 2026-04-14
**Last Updated:** 2026-04-14

---

## Phase Summary

| Phase | Name | Chunks | Est. Sessions | Status |
|-------|------|--------|---------------|--------|
| 0 | Foundation (SDF Objects) | 8 | 2 | Not Started |
| 1 | Companion Toolset | 12 | 4 | Not Started |
| 2 | Extension Records + Roles + v1 Retirement | 7 | 2 | Not Started |
| 3 | UIF SPA Suitelet | 16 | 5-6 | Not Started |
| 4 | Testing & Documentation | 7 | 3 | Not Started |
| **Total** | | **50** | **16-17** | |

---

## Chunk Breakdown

### Phase 0: Foundation (SDF Objects)

Everything in the project depends on these custom objects existing in NetSuite.

#### FOUND-001: Custom List — Edition (`customlist_dz_pm_edition`)
- **Purpose:** Create SDF XML for 4-value edition list (Distillery, Winery, Brewery, Cross-Edition)
- **Inputs:** ADR-001 edition list spec
- **Outputs:** `src/Objects/customlist_dz_pm_edition.xml`
- **Depends on:** None
- **Size:** XS
- **Verification:** XML validates; `aidescription` on every value

#### FOUND-002: Custom List — Complexity (`customlist_dz_pm_complexity`)
- **Purpose:** Create SDF XML for 4-value governance tier list (Minimal, Standard, Governed, Supervised)
- **Inputs:** ADR-001 governance tiers
- **Outputs:** `src/Objects/customlist_dz_pm_complexity.xml`
- **Depends on:** None
- **Size:** XS
- **Verification:** XML validates; `aidescription` on every value

#### FOUND-003: Custom List — Status (`customlist_dz_pm_status`)
- **Purpose:** Create SDF XML for 4-value status list (Active, Draft, Deprecated, Testing)
- **Inputs:** ADR-001 status spec
- **Outputs:** `src/Objects/customlist_dz_pm_status.xml`
- **Depends on:** None
- **Size:** XS
- **Verification:** XML validates; `aidescription` on every value

#### FOUND-004: Custom Record — Extension Record (`customrecord_dz_prompt_meta`)
- **Purpose:** Create SDF XML for the core extension record (~20 fields with FK to Atlas prompt, domain, toolset, tool chain, steps, edition, params, safety rules, governance, artifact, version, status)
- **Inputs:** CLAUDE.md extension record field table; ADR-001 field specs
- **Outputs:** `src/Objects/customrecord_dz_prompt_meta.xml`
- **Depends on:** FOUND-001, FOUND-002, FOUND-003 (list references)
- **Size:** M
- **Verification:** XML validates; all field types correct; FK to `customrecord_atlas_aicomp_prompts`; `aidescription` on every field; all list refs point to correct custom lists

#### FOUND-005: Custom Record — Execution Log (`customrecord_dz_exec_log`)
- **Purpose:** Create SDF XML for lightweight execution log (~8 fields)
- **Inputs:** ADR-001 exec log spec
- **Outputs:** `src/Objects/customrecord_dz_exec_log.xml`
- **Depends on:** None
- **Size:** S
- **Verification:** XML validates; FK to Atlas prompt; `aidescription` on every field

#### FOUND-006: Toolset XML (`custtoolset_crafted_companion`)
- **Purpose:** Create toolset definition XML with both expose flags. Contains placeholder entries for T-001 through T-004.
- **Inputs:** ADR-001 toolset spec; CLAUDE.md critical dev rules (both expose flags)
- **Outputs:** `src/Objects/custtoolset_crafted_companion.xml`
- **Depends on:** None
- **Size:** XS
- **Verification:** Both `<exposetoaiconnector>T</exposetoaiconnector>` AND `<exposeto3rdpartyagents>T</exposeto3rdpartyagents>` present

#### FOUND-007: SDF Project Setup (`project.json`, `suitecloud.config.js`)
- **Purpose:** Initialize the SDF project configuration for the crafted-companion package
- **Inputs:** Existing packages (barrel-intelligence, etc.) as templates
- **Outputs:** `project.json`, `suitecloud.config.js`, folder structure under `src/`
- **Depends on:** None
- **Size:** XS
- **Verification:** `suitecloud project:validate` passes

#### FOUND-008: SDF Deploy + Verify
- **Purpose:** Deploy all Phase 0 objects to TSTDRV1912378 and verify via SuiteQL
- **Inputs:** All FOUND-001 through FOUND-007 outputs
- **Depends on:** FOUND-001, FOUND-002, FOUND-003, FOUND-004, FOUND-005, FOUND-006, FOUND-007
- **Size:** S
- **Verification:** SuiteQL queries confirm: extension record type exists with all fields; exec log exists; 3 custom lists exist with correct values; toolset visible in AI Connector
- **HITM Gate:** Pause for approval before proceeding to Phase 1

---

### Phase 1: Companion Toolset (4 Tools)

All tools are Custom Tool Scripts in the `crafted-companion` toolset.

#### TOOL-001: `getPromptMeta` — Design Doc
- **Purpose:** Define query strategy, response shape, governance budget, edge cases
- **Inputs:** Extension record schema (FOUND-004); CLAUDE.md orchestration section
- **Outputs:** Design document or inline spec in this plan
- **Depends on:** FOUND-008 (SDF deployed)
- **Size:** S
- **Verification:** Design reviewed; SuiteQL query sketched; governance stays under 50 units

#### TOOL-002: `getPromptMeta` — Implementation
- **Purpose:** Implement the tool script (.js), JSON schema (.json), add to toolset XML
- **Inputs:** TOOL-001 design; extension record deployed
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/companion-tools/getPromptMeta.js`, `getPromptMeta.json`
- **Depends on:** TOOL-001
- **Size:** M
- **Verification:** Tool deploys; MCP invocation returns correct extension data for barrel prompt 101; governance < 50 units

#### TOOL-003: `logExecution` — Design + Implementation
- **Purpose:** Lightweight execution log tool. Simple enough for combined design+implementation.
- **Inputs:** Exec log record schema (FOUND-005)
- **Outputs:** `logExecution.js`, `logExecution.json`
- **Depends on:** FOUND-008
- **Size:** S
- **Verification:** Tool creates exec log record; record queryable via SuiteQL

#### TOOL-004: `seedPrompt` — Design Doc
- **Purpose:** Define idempotency strategy (externalid matching), Atlas record creation, extension record creation, role assignment, multi-select field format, error handling
- **Inputs:** Atlas schema trace (8-object model); CLAUDE.md multi-select format
- **Outputs:** Design document
- **Depends on:** FOUND-008
- **Size:** S
- **Verification:** Design covers: create Atlas prompt, create extension record, idempotent duplicate detection, role assignment, industry assignment

#### TOOL-005: `seedPrompt` — Phase 1 (Atlas Prompt Creation)
- **Purpose:** Implement the Atlas prompt creation portion: create `customrecord_atlas_aicomp_prompts` record with name, text, category, subcategory, roles, industries, public, externalid
- **Inputs:** TOOL-004 design; Atlas schema trace
- **Outputs:** First half of `seedPrompt.js`
- **Depends on:** TOOL-004
- **Size:** M
- **Verification:** Creates a test prompt in Atlas; duplicate detection works via externalid query

#### TOOL-006: `seedPrompt` — Phase 2 (Extension Record + Assembly)
- **Purpose:** Implement extension record creation and wire up the full tool: Atlas prompt + extension record in one idempotent operation
- **Inputs:** TOOL-005 output; extension record schema
- **Outputs:** Complete `seedPrompt.js`, `seedPrompt.json`
- **Depends on:** TOOL-005
- **Size:** M
- **Verification:** Full tool deploys; creates Atlas prompt + extension record; idempotent re-run doesn't duplicate; `getPromptMeta` returns the seeded data

#### TOOL-007: `updatePrompt` — Design + Implementation
- **Purpose:** Update Atlas prompt text and/or extension record fields. Version bump on extension record.
- **Inputs:** TOOL-004 design patterns (similar record access); Atlas schema trace
- **Outputs:** `updatePrompt.js`, `updatePrompt.json`
- **Depends on:** TOOL-006 (needs seedPrompt working to have data to update)
- **Size:** M
- **Verification:** Updates prompt text; updates extension fields; version field increments; getPromptMeta reflects changes

#### TOOL-008: Deploy Toolset + MCP Reconnect
- **Purpose:** Deploy all 4 tools to sandbox, reconnect MCP connector, smoke test all tools via AI Connector
- **Inputs:** All TOOL outputs
- **Outputs:** Deployed toolset in TSTDRV1912378
- **Depends on:** TOOL-002, TOOL-003, TOOL-006, TOOL-007
- **Size:** S
- **Verification:** All 4 tools visible in MCP; each tool invocable from Claude; round-trip test: seedPrompt → getPromptMeta → updatePrompt → logExecution

#### TOOL-009: Toolset JSON Schema Validation
- **Purpose:** Validate all 4 JSON schemas against NetSuite constraints (no `enum`, correct types, descriptions contain valid values)
- **Inputs:** All `.json` schema files
- **Outputs:** Validated schemas (fixes if needed)
- **Depends on:** TOOL-002, TOOL-003, TOOL-006, TOOL-007
- **Size:** XS
- **Verification:** `validateToolSchema` passes for all 4 tools; no `enum` anywhere

#### TOOL-010: getPromptMeta — Edge Cases + Hardening
- **Purpose:** Handle edge cases: prompt with no extension record, inactive prompt, null fields, missing toolset
- **Inputs:** TOOL-002 base implementation
- **Outputs:** Updated `getPromptMeta.js`
- **Depends on:** TOOL-008 (deployed and testable)
- **Size:** S
- **Verification:** Graceful response for: Oracle prompt (no extension), inactive prompt, missing prompt ID

#### TOOL-011: seedPrompt — Role + Mapping Support
- **Purpose:** Extend seedPrompt to also create Crafted Companion roles in `customrecord_atlas_aicomp_prompt_roles` and update `role_mapping` records if needed
- **Inputs:** Atlas schema trace (roles, role_mapping); TOOL-006 base
- **Outputs:** Updated `seedPrompt.js` with role creation logic
- **Depends on:** TOOL-006
- **Size:** M
- **Verification:** Creates a new Companion role; assigns it to a prompt; idempotent on re-run

#### TOOL-012: Toolset Integration Test
- **Purpose:** Full round-trip test: seed a new test prompt with roles → get its meta → update it → log an execution → verify all records exist
- **Inputs:** All deployed tools
- **Outputs:** Test results documented
- **Depends on:** TOOL-008, TOOL-010, TOOL-011
- **Size:** S
- **Verification:** Clean round-trip; all records queryable via SuiteQL; cleanup of test data
- **HITM Gate:** Pause for approval before Phase 2

---

### Phase 2: Extension Records + Roles + v1 Retirement

#### DATA-001: Define Crafted Companion Roles
- **Purpose:** Identify and create ~5-8 Crafted-specific roles in `customrecord_atlas_aicomp_prompt_roles` (Distiller, Cellar Master, Production Manager, Winemaker, QC Manager, etc.)
- **Inputs:** Atlas schema trace (unmapped roles list); customer role patterns
- **Outputs:** Role records created in sandbox; external IDs assigned (`aipromptrolecrafted_NNN`)
- **Depends on:** TOOL-011 (seedPrompt role support)
- **Size:** S
- **Verification:** Roles queryable via SuiteQL; assigned to barrel prompts

#### DATA-002: Update Role Mappings for Crafted NS Roles
- **Purpose:** Map the 15 unmapped NS roles to appropriate Companion roles using Manual Override (method=3)
- **Inputs:** Atlas schema trace (33 role mappings, 15 unmapped); DATA-001 new roles
- **Outputs:** Updated `customrecord_atlas_aicomp_role_mapping` records
- **Depends on:** DATA-001
- **Size:** S
- **Verification:** All 33 role mappings now have a companion role assigned; confidence > 0; method = Manual Override

#### DATA-003: Barrel Extension Records (Prompts 101-106)
- **Purpose:** Create `customrecord_dz_prompt_meta` records for barrel prompts 101-106 (first batch of 6)
- **Inputs:** `prompts/barrel-intelligence/barrel-intelligence-prompts.md`; extension record schema
- **Outputs:** 6 extension records in sandbox
- **Depends on:** FOUND-008, TOOL-008
- **Size:** M
- **Verification:** `getPromptMeta` returns correct data for each; tool chain, steps, params, safety rules all populated

#### DATA-004: Barrel Extension Records (Prompts 107-109, 201-203)
- **Purpose:** Create `customrecord_dz_prompt_meta` records for remaining 6 barrel prompts
- **Inputs:** Same as DATA-003
- **Outputs:** 6 more extension records in sandbox
- **Depends on:** DATA-003 (template validated)
- **Size:** M
- **Verification:** All 12 barrel prompts have extension records; `getPromptMeta` works for all

#### DATA-005: v1 Prompt Engine Retirement — Records
- **Purpose:** Mark all v1 custom records as inactive: playbooks, sections, shared sections, old execution log
- **Inputs:** Scope doc R-001 through R-004
- **Outputs:** All v1 records `isinactive=T`
- **Depends on:** DATA-003 (new system has data before old is retired)
- **Size:** XS
- **Verification:** SuiteQL count of active v1 records = 0

#### DATA-006: v1 Prompt Engine Retirement — Tools
- **Purpose:** Remove 10 playbook tools from active prompt-engine toolset. Retain `detectAccountConfig` and `getAccountConfig`.
- **Inputs:** Scope doc R-005; toolset-registry.yaml
- **Outputs:** Updated toolset XML; updated toolset-registry.yaml
- **Depends on:** DATA-005
- **Size:** S
- **Verification:** 10 retired tools no longer visible in MCP after reconnect; `detectAccountConfig` and `getAccountConfig` still work

#### DATA-007: Extension Records + Retirement Verification
- **Purpose:** Comprehensive verification: all 12 barrel extension records correct, v1 retired, roles created, mappings updated
- **Inputs:** All DATA outputs
- **Outputs:** Verification report
- **Depends on:** DATA-001 through DATA-006
- **Size:** S
- **Verification:** Full SuiteQL audit: extension record count, role count, mapping status, v1 inactive count
- **HITM Gate:** Pause for approval before Phase 3

---

### Phase 3: UIF SPA Suitelet

#### SPA-001: Backend Suitelet — Design Doc
- **Purpose:** Define REST API endpoints (GET/POST), SuiteQL queries (Atlas prompts JOIN extension records), response shapes, authentication, governance budget
- **Inputs:** ADR-001 SPA section; Oracle UIF SPA Reference; scope doc SPA-001
- **Outputs:** API design document
- **Depends on:** FOUND-008 (SDF deployed), TOOL-008 (tools working)
- **Size:** S
- **Verification:** API endpoints, query patterns, and response shapes defined

#### SPA-002: Backend Suitelet — Implementation
- **Purpose:** Implement the Suitelet: GET serves SPA shell (HTML + script includes), POST handles REST API (query prompts, query tool availability, query roles)
- **Inputs:** SPA-001 design; Oracle UIF reference files
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/suitelet/crafted_companion_sl.js`
- **Depends on:** SPA-001
- **Size:** L (may need sub-chunking)
- **Verification:** GET returns HTML shell; POST returns JSON prompt data; SuiteQL governance < 200 units

#### SPA-003: SPA Entry Point + App Shell (`app.js`)
- **Purpose:** Root UIF component with ApplicationHeader, navigation, app-level state initialization
- **Inputs:** Oracle UIF core.d.ts reference; SPA-002 (backend serving the shell)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/app.js`
- **Depends on:** SPA-002
- **Size:** M
- **Verification:** SPA loads in NetSuite; header renders; no console errors

#### SPA-004: Store + Reducer (State Management)
- **Purpose:** UIF Store with Reducer for app state: filter state, search query, loaded prompts, selected prompt, tool availability cache
- **Inputs:** Oracle UIF core.d.ts (Store, Reducer patterns)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/store/`
- **Depends on:** SPA-003
- **Size:** M
- **Verification:** Store initializes; dispatch actions update state; components re-render on state change

#### SPA-005: API Module (`api.js`)
- **Purpose:** Ajax wrapper for Suitelet backend calls: fetchPrompts, fetchToolAvailability, fetchRoles
- **Inputs:** SPA-001 API design; Oracle UIF Ajax module
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/api.js`
- **Depends on:** SPA-002, SPA-004
- **Size:** S
- **Verification:** API calls return data; error handling works; loading states dispatched to store

#### SPA-006: Domain Tabs (TabPanel)
- **Purpose:** Tab component showing one tab per Crafted domain. Tabs populated from API data. Hidden tabs for domains with no deployed toolset.
- **Inputs:** UIF component.d.ts (TabPanel); SPA-005 (data); SPA-004 (state)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/DomainTabs.js`
- **Depends on:** SPA-004, SPA-005
- **Size:** M
- **Verification:** Tabs render for each domain; tab selection filters prompts; empty domains hidden

#### SPA-007: Card Grid (Prompt Cards)
- **Purpose:** Grid of prompt cards showing name, domain tag, governance badge, tool count, status pill
- **Inputs:** UIF component.d.ts (GridView, Card); SPA-004 (filtered prompts)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/CardGrid.js`
- **Depends on:** SPA-004, SPA-006
- **Size:** M
- **Verification:** Cards render with correct data; governance badges show correct tier color; click opens detail modal

#### SPA-008: Search (TextBox)
- **Purpose:** Client-side search across prompt name, text, and tool names. Dispatches filter to Store.
- **Inputs:** UIF component.d.ts (TextBox); SPA-004 (state)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/SearchBar.js`
- **Depends on:** SPA-004
- **Size:** S
- **Verification:** Typing filters card grid in real-time; clearing restores full list

#### SPA-009: Filter Panel + Edition Filter + Tool Validation
- **Purpose:** Edition filter (distillery/winery/brewery/cross) using `detectAccountConfig`. Governance level filter. Hard tool validation: domains with undeployed toolsets are completely hidden from the UI.
- **Inputs:** UIF component.d.ts (FilterPanel, FilterChip); `detectAccountConfig` response; extension record `tool_deps` field
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/FilterPanel.js`
- **Depends on:** SPA-004, SPA-005
- **Size:** M
- **Verification:** Edition filter shows only matching prompts; governance filter works; toolset validation hides prompts with missing tools

#### SPA-010: Prompt Detail Modal
- **Purpose:** Full prompt detail overlay: prompt text, tool chain visualization, parameter table, safety rules, governance level, version info, action buttons (Copy to Clipboard, Send to Claude)
- **Inputs:** UIF component.d.ts (Modal, Button, Badge); extension record data via SPA-005
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/PromptDetailModal.js`
- **Depends on:** SPA-004, SPA-007 (card click triggers modal)
- **Size:** L (may need sub-chunking into layout + actions)
- **Verification:** Modal opens on card click; all fields populated; Copy button works; close/escape dismisses

#### SPA-011: Admin Banner
- **Purpose:** Banner that shows which toolsets need deployment to unlock additional domains. Only visible when some domains are hidden due to missing toolsets.
- **Inputs:** SPA-009 tool validation data; UIF component.d.ts (Banner)
- **Outputs:** `src/FileCabinet/SuiteScripts/DoozyTools/spa/components/AdminBanner.js`
- **Depends on:** SPA-009
- **Size:** S
- **Verification:** Banner appears when toolset missing; lists specific toolset names; hidden when all toolsets deployed

#### SPA-012: SPA Deploy + Smoke Test
- **Purpose:** Deploy all SPA components to sandbox; verify full functionality
- **Inputs:** All SPA outputs
- **Outputs:** Working SPA in TSTDRV1912378
- **Depends on:** SPA-002 through SPA-011
- **Size:** S
- **Verification:** SPA loads; tabs work; cards render; search works; filters work; modal opens; admin banner shows/hides correctly

#### SPA-013: SPA — Responsive Layout + Polish
- **Purpose:** Ensure SPA works well at different viewport sizes; fix visual issues; align with Redwood design tokens
- **Inputs:** SPA-012 (deployed); Oracle Redwood tokens from AI Connector Instructions
- **Outputs:** Updated SPA component files
- **Depends on:** SPA-012
- **Size:** S
- **Verification:** Visual review at standard NetSuite viewport sizes

#### SPA-014: SPA — Error States + Loading
- **Purpose:** Add loading spinners, empty states ("No prompts match your filters"), error states (API failure), and timeout handling
- **Inputs:** SPA-012 (deployed)
- **Outputs:** Updated SPA components
- **Depends on:** SPA-012
- **Size:** S
- **Verification:** Loading shown during API calls; graceful error messages; empty state for no-match filters

#### SPA-015: SPA Backend — Performance Tuning
- **Purpose:** Optimize SuiteQL queries (indexing, pagination if needed), governance monitoring, response caching strategy
- **Inputs:** SPA-002 (backend); live query performance data
- **Outputs:** Updated backend Suitelet
- **Depends on:** SPA-012, DATA-003/DATA-004 (needs real data volume)
- **Size:** S
- **Verification:** API response < 2s; governance < 200 units per request

#### SPA-016: SPA Integration Test
- **Purpose:** Full flow test: load SPA → browse domains → filter by edition → search → open prompt detail → copy prompt → verify getPromptMeta → execute tool chain
- **Inputs:** All SPA components deployed; barrel extension records in place
- **Outputs:** Test results documented
- **Depends on:** SPA-012, DATA-007
- **Size:** S
- **Verification:** End-to-end flow works without errors
- **HITM Gate:** Pause for approval before Phase 4

---

### Phase 4: Testing & Documentation

#### DOC-001: Technical Design Specification (TDS)
- **Purpose:** Formal TDS covering extension record schema, toolset architecture, SPA design, SuiteQL queries, deployment procedures
- **Inputs:** All Phase 0-3 outputs; ADR-001
- **Outputs:** `docs/specs/tds-crafted-companion-v2.md`
- **Depends on:** SPA-016 (all components built)
- **Size:** M
- **Verification:** Covers all deliverables; field tables accurate; query examples runnable

#### DOC-002: Admin Guide
- **Purpose:** Admin-facing guide: prompt management (seeding, updating, monitoring), extension record field reference, SPA configuration, role management
- **Inputs:** All Phase 0-3 outputs
- **Outputs:** `docs/kb/admin/crafted-companion-admin-guide.md`
- **Depends on:** SPA-016
- **Size:** S
- **Verification:** Non-developer admin can follow the guide to manage prompts

#### DOC-003: Deployment Runbook
- **Purpose:** Step-by-step deployment: SDF deploy, MCP reconnect, smoke test checklist, rollback procedures
- **Inputs:** FOUND-008 and TOOL-008 deployment experience
- **Outputs:** `docs/deployment/deployment-runbook.md`
- **Depends on:** SPA-016
- **Size:** S
- **Verification:** Another developer can follow the runbook to deploy from scratch

#### TEST-001: Cross-Edition Validation
- **Purpose:** Deploy to TSTDRV1915090 (winery) and verify edition filtering, tool validation, and SPA behavior with different account config
- **Inputs:** All Phase 0-3 outputs deployed to distillery
- **Outputs:** Test results; any cross-edition bugs fixed
- **Depends on:** SPA-016
- **Size:** M
- **Verification:** SPA correctly filters by edition; winery-specific behavior works; barrel prompts (distillery) hidden in winery account (or shown as cross-edition)

#### TEST-002: Regression Test — Existing Toolsets
- **Purpose:** Verify all 53 existing Custom Tool Scripts still work correctly after v1 retirement and companion toolset deployment
- **Inputs:** Existing tool tests; detectAccountConfig; getAccountConfig
- **Outputs:** Test results
- **Depends on:** DATA-006 (v1 tools retired)
- **Size:** M
- **Verification:** All retained tools invocable via MCP; detectAccountConfig returns expected probe results

#### TEST-003: Security + Permissions Review
- **Purpose:** Verify SPA respects NetSuite role permissions; extension records accessible only to appropriate roles; no unauthorized data exposure
- **Inputs:** SDF permissions reference from Oracle agent skills
- **Outputs:** Security review notes
- **Depends on:** SPA-016
- **Size:** S
- **Verification:** SPA loads correctly for admin role; restricted role sees appropriate subset; no cross-subsidiary data leakage

#### TEST-004: Phase 1 Final Verification + Gate
- **Purpose:** Comprehensive final check: all 50 chunks complete, all tests passing, all docs written, ready for HITM sign-off
- **Inputs:** All Phase 0-4 outputs
- **Outputs:** Phase 1 completion report
- **Depends on:** DOC-001, DOC-002, DOC-003, TEST-001, TEST-002, TEST-003
- **Size:** S
- **Verification:** All deliverables accounted for; no open blockers; gate checkpoint log updated
- **HITM Gate:** Phase 1 complete — approval to proceed to Phase 2

---

## Dependency Map

```
PHASE 0: FOUNDATION
  FOUND-001 (Edition List) ─────┐
  FOUND-002 (Complexity List) ──┤
  FOUND-003 (Status List) ──────┼──> FOUND-004 (Extension Record) ──┐
  FOUND-005 (Exec Log) ─────────┤                                   │
  FOUND-006 (Toolset XML) ──────┤                                   │
  FOUND-007 (Project Setup) ────┘                                   │
                                                                    │
  FOUND-008 (Deploy + Verify) <─────────────────────────────────────┘
       │                  [HITM GATE]
       ▼
PHASE 1: TOOLSET
  TOOL-001 (getPM Design) ──> TOOL-002 (getPM Impl) ──────────────┐
  TOOL-003 (logExec D+I) ─────────────────────────────────────────┤
  TOOL-004 (seed Design) ──> TOOL-005 (seed P1) ──> TOOL-006 ────┤
                                                (seed P2)          │
  TOOL-007 (update D+I) ─────────────────────────────────────────┤
       │                                                           │
  TOOL-009 (Schema Validation) <───────────────────────────────────┤
  TOOL-008 (Deploy + MCP) <────────────────────────────────────────┘
       │
  TOOL-010 (getPM Edge Cases) ──┐
  TOOL-011 (seed Roles) ───────┤
                                │
  TOOL-012 (Integration Test) <─┘
       │                  [HITM GATE]
       ▼
PHASE 2: DATA + RETIREMENT
  DATA-001 (Create Roles) ──> DATA-002 (Update Mappings) ─────────┐
  DATA-003 (Barrel Ext 1-6) ──> DATA-004 (Barrel Ext 7-12) ──────┤
  DATA-005 (v1 Retire Records) ──> DATA-006 (v1 Retire Tools) ───┤
                                                                   │
  DATA-007 (Verification) <────────────────────────────────────────┘
       │                  [HITM GATE]
       ▼
PHASE 3: UIF SPA
  SPA-001 (Backend Design) ──> SPA-002 (Backend Impl) ────────────┐
                                    │                               │
  SPA-003 (App Shell) <─────────────┘                               │
       │                                                            │
  SPA-004 (Store) ──────────────────────────────────────────────┐  │
  SPA-005 (API Module) <────────────────────────────────────────┤  │
       │                                                        │  │
  SPA-006 (Domain Tabs) ──────────────────────────────────────┐│  │
  SPA-007 (Card Grid) ───────────────────────────────────────┐││  │
  SPA-008 (Search) ──────────────────────────────────────────┐│││  │
  SPA-009 (Filters + Tool Val) ──> SPA-011 (Admin Banner) ──┤│││  │
  SPA-010 (Detail Modal) ───────────────────────────────────┤│││  │
                                                             │││││  │
  SPA-012 (Deploy + Smoke) <─────────────────────────────────┘┘┘┘  │
       │                                                            │
  SPA-013 (Polish) ──────────────────────────────────────────────┐ │
  SPA-014 (Error States) ───────────────────────────────────────┤ │
  SPA-015 (Performance) ────────────────────────────────────────┤ │
                                                                 │ │
  SPA-016 (Integration Test) <───────────────────────────────────┘ │
       │                  [HITM GATE]                               │
       ▼                                                            │
PHASE 4: TEST + DOCS                                                │
  DOC-001 (TDS) ─────────────────────────────────────────────────┐ │
  DOC-002 (Admin Guide) ────────────────────────────────────────┤ │
  DOC-003 (Deployment Runbook) ─────────────────────────────────┤ │
  TEST-001 (Cross-Edition) ────────────────────────────────────┤ │
  TEST-002 (Regression) ──────────────────────────────────────┤ │
  TEST-003 (Security) ────────────────────────────────────────┤ │
                                                                │ │
  TEST-004 (Final Verification) <───────────────────────────────┘ │
                          [HITM GATE — PHASE 1 COMPLETE]
```

### Critical Path

```
FOUND-004 → FOUND-008 → TOOL-001 → TOOL-002 → TOOL-008 → DATA-003 → SPA-001 → SPA-002 → SPA-003 → SPA-012 → SPA-016 → TEST-004
```

The critical path runs 12 chunks deep. The bottleneck is the Backend Suitelet (SPA-002), which blocks all frontend SPA work. The companion toolset must be functional before extension records can be created, and extension records must exist before the SPA has meaningful data to display.

---

## Milestones

| Milestone | Name | Target | Criteria | Gate Type |
|-----------|------|--------|----------|-----------|
| M-0 | Foundation Deployed | End of Session 2 | All SDF objects deployed and queryable in sandbox | APPROVAL |
| M-1 | Toolset Functional | End of Session 6 | All 4 tools deployed, MCP-invocable, round-trip tested | APPROVAL |
| M-2 | Barrel Domain Live | End of Session 8 | 12 extension records created; v1 retired; roles created | APPROVAL |
| M-3 | SPA Functional | End of Session 14 | SPA loads, tabs/cards/filters/search/modal all working | APPROVAL |
| M-4 | Phase 1 Complete | End of Session 17 | All tests passing, docs written, cross-edition validated | APPROVAL |

---

## Session Plan

### Session 1: SDF Object XML (FOUND-001 through FOUND-006)
- Write all 3 custom list XMLs (XS each)
- Write extension record XML (M — main effort)
- Write execution log XML (S)
- Write toolset XML (XS)
- **Goal:** All SDF XML files ready for deploy

### Session 2: Project Setup + Deploy (FOUND-007, FOUND-008)
- Initialize SDF project config
- Deploy to sandbox
- Verify all objects via SuiteQL
- **Gate:** M-0 — Foundation Deployed

### Session 3: getPromptMeta (TOOL-001, TOOL-002)
- Design query strategy and response shape
- Implement tool script + JSON schema
- Test via MCP

### Session 4: logExecution + seedPrompt Design (TOOL-003, TOOL-004)
- Implement logExecution (simple)
- Design seedPrompt (complex — idempotency, multi-select, roles)

### Session 5: seedPrompt Implementation (TOOL-005, TOOL-006)
- Phase 1: Atlas prompt creation
- Phase 2: Extension record + assembly
- Test idempotency

### Session 6: updatePrompt + Deploy + Test (TOOL-007, TOOL-008, TOOL-009)
- Implement updatePrompt
- Deploy all tools
- Validate JSON schemas
- **Gate:** M-1 — Toolset Functional

### Session 7: Edge Cases + Roles (TOOL-010, TOOL-011, TOOL-012)
- Harden getPromptMeta edge cases
- Add role creation to seedPrompt
- Full integration test

### Session 8: Extension Records + Roles (DATA-001 through DATA-004)
- Create Crafted Companion roles
- Update role mappings
- Create all 12 barrel extension records

### Session 9: v1 Retirement + Verification (DATA-005, DATA-006, DATA-007)
- Mark v1 records inactive
- Retire v1 tools
- Comprehensive verification
- **Gate:** M-2 — Barrel Domain Live

### Session 10: SPA Backend (SPA-001, SPA-002)
- Design REST API
- Implement Suitelet (GET + POST)

### Session 11: SPA Core (SPA-003, SPA-004, SPA-005)
- App shell + root component
- Store + Reducer
- API module

### Session 12: SPA Components 1 (SPA-006, SPA-007, SPA-008)
- Domain tabs
- Card grid
- Search

### Session 13: SPA Components 2 (SPA-009, SPA-010, SPA-011)
- Filter panel + tool validation
- Prompt detail modal
- Admin banner

### Session 14: SPA Deploy + Smoke (SPA-012)
- Deploy to sandbox
- Full smoke test
- **Gate:** M-3 — SPA Functional

### Session 15: SPA Polish (SPA-013, SPA-014, SPA-015, SPA-016)
- Responsive layout
- Error states + loading
- Performance tuning
- Integration test

### Session 16: Documentation (DOC-001, DOC-002, DOC-003)
- TDS
- Admin guide
- Deployment runbook

### Session 17: Final Testing + Gate (TEST-001 through TEST-004)
- Cross-edition validation
- Regression testing
- Security review
- Final verification
- **Gate:** M-4 — Phase 1 Complete

---

## Progress Tracker

| Chunk ID | Title | Size | Status | Completed | Notes |
|----------|-------|------|--------|-----------|-------|
| **Phase 0: Foundation** | | | | | |
| FOUND-001 | Edition List XML | XS | ⬜ Not Started | | |
| FOUND-002 | Complexity List XML | XS | ⬜ Not Started | | |
| FOUND-003 | Status List XML | XS | ⬜ Not Started | | |
| FOUND-004 | Extension Record XML | M | ⬜ Not Started | | |
| FOUND-005 | Execution Log XML | S | ⬜ Not Started | | |
| FOUND-006 | Toolset XML | XS | ⬜ Not Started | | |
| FOUND-007 | SDF Project Setup | XS | ⬜ Not Started | | |
| FOUND-008 | SDF Deploy + Verify | S | ⬜ Not Started | | HITM Gate |
| **Phase 1: Toolset** | | | | | |
| TOOL-001 | getPromptMeta Design | S | ⬜ Not Started | | |
| TOOL-002 | getPromptMeta Impl | M | ⬜ Not Started | | |
| TOOL-003 | logExecution D+I | S | ⬜ Not Started | | |
| TOOL-004 | seedPrompt Design | S | ⬜ Not Started | | |
| TOOL-005 | seedPrompt Phase 1 | M | ⬜ Not Started | | |
| TOOL-006 | seedPrompt Phase 2 | M | ⬜ Not Started | | |
| TOOL-007 | updatePrompt D+I | M | ⬜ Not Started | | |
| TOOL-008 | Deploy + MCP Reconnect | S | ⬜ Not Started | | |
| TOOL-009 | Schema Validation | XS | ⬜ Not Started | | |
| TOOL-010 | getPM Edge Cases | S | ⬜ Not Started | | |
| TOOL-011 | seedPrompt Roles | M | ⬜ Not Started | | |
| TOOL-012 | Integration Test | S | ⬜ Not Started | | HITM Gate |
| **Phase 2: Data + Retirement** | | | | | |
| DATA-001 | Create Crafted Roles | S | ⬜ Not Started | | |
| DATA-002 | Update Role Mappings | S | ⬜ Not Started | | |
| DATA-003 | Barrel Ext Records 1-6 | M | ⬜ Not Started | | |
| DATA-004 | Barrel Ext Records 7-12 | M | ⬜ Not Started | | |
| DATA-005 | v1 Retire Records | XS | ⬜ Not Started | | |
| DATA-006 | v1 Retire Tools | S | ⬜ Not Started | | |
| DATA-007 | Verification | S | ⬜ Not Started | | HITM Gate |
| **Phase 3: UIF SPA** | | | | | |
| SPA-001 | Backend Design | S | ⬜ Not Started | | |
| SPA-002 | Backend Impl | L | ⬜ Not Started | | |
| SPA-003 | App Shell | M | ⬜ Not Started | | |
| SPA-004 | Store + Reducer | M | ⬜ Not Started | | |
| SPA-005 | API Module | S | ⬜ Not Started | | |
| SPA-006 | Domain Tabs | M | ⬜ Not Started | | |
| SPA-007 | Card Grid | M | ⬜ Not Started | | |
| SPA-008 | Search | S | ⬜ Not Started | | |
| SPA-009 | Filters + Tool Val | M | ⬜ Not Started | | |
| SPA-010 | Prompt Detail Modal | L | ⬜ Not Started | | |
| SPA-011 | Admin Banner | S | ⬜ Not Started | | |
| SPA-012 | Deploy + Smoke | S | ⬜ Not Started | | |
| SPA-013 | Polish | S | ⬜ Not Started | | |
| SPA-014 | Error States | S | ⬜ Not Started | | |
| SPA-015 | Performance | S | ⬜ Not Started | | |
| SPA-016 | Integration Test | S | ⬜ Not Started | | HITM Gate |
| **Phase 4: Test + Docs** | | | | | |
| DOC-001 | TDS | M | ⬜ Not Started | | |
| DOC-002 | Admin Guide | S | ⬜ Not Started | | |
| DOC-003 | Deployment Runbook | S | ⬜ Not Started | | |
| TEST-001 | Cross-Edition | M | ⬜ Not Started | | |
| TEST-002 | Regression | M | ⬜ Not Started | | |
| TEST-003 | Security | S | ⬜ Not Started | | |
| TEST-004 | Final Verification | S | ⬜ Not Started | | HITM Gate |

Status: ⬜ Not Started | 🔵 In Progress | ✅ Complete | 🔴 Blocked | ⏸️ Deferred

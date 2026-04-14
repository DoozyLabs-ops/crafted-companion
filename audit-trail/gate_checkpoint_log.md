# Gate Checkpoint Log — Crafted Companion

---

## Discovery Phase

### Checkpoint: Atlas AI Companion Schema Trace
- **Date:** 2026-04-14
- **Status:** Complete
- **Findings:** Full schema trace of `customrecord_atlas_aicomp_prompts` — 20 fields, 7 scripts, 6 categories, bundle-locked record type. Cannot add custom fields.
- **Artifact:** `docs/discovery/atlas-ai-companion-schema-trace.md`
- **Approved by:** Luke (HITM)

### Checkpoint: Oracle Agent Skills Review
- **Date:** 2026-04-14
- **Status:** Complete
- **Findings:** 3 skills in `oracle/netsuite-suitecloud-sdk/packages/agent-skills/` — AI Connector Instructions (system prompt for MCP sessions), SDF Roles & Permissions (permission reference), UIF SPA Reference (component type defs). Crafted Companion layers on top of AI Connector Instructions.
- **Artifact:** Reviewed in session, key findings captured in CLAUDE.md
- **Approved by:** Luke (HITM)

### Checkpoint: Extension Record Design
- **Date:** 2026-04-14
- **Status:** Complete
- **Findings:** Two-layer approach — extension record (`customrecord_dz_prompt_meta`, 18 fields) + embedded meta block (YAML in HTML comment). Designed to align with existing toolset-registry, prompt engine, and intelligence config.
- **Artifact:** `docs/discovery/companion-prompt-extension-design.md`
- **Approved by:** Luke (HITM)

### Checkpoint: Barrel Domain Prompts Seeded
- **Date:** 2026-04-14
- **Status:** Complete
- **Findings:** 12 barrel intelligence companion prompts created in TSTDRV1912378 (IDs 101-109, 201-203). All set to category=6 (Manufacturing), subcategory="Barrel Intelligence", role=5 (Administrator), industry=17 (Food & Beverage).
- **Artifact:** `prompts/barrel-intelligence/barrel-intelligence-prompts.md`
- **Approved by:** Luke (HITM)

### Checkpoint: Full Discovery Document
- **Date:** 2026-04-14
- **Status:** Complete
- **Findings:** 5-track discovery completed. 10 functional requirements (5 MUST, 3 SHOULD, 2 NICE), 5 NFRs, 4 IRs. 9 gaps identified. 8 risks registered. 5 assumptions documented. 4 open design questions with recommendations.
- **Artifact:** `docs/discovery/discovery-document.md`
- **Environment data:** 113 total prompts (100 Oracle + 12 Crafted + 1 other), 14 AI Companion roles, 7 categories, 39 industries. Account config: 4 editions, 4 subsidiaries, LOT costing, barrel management active.
- **Approved by:** Pending HITM review

### Checkpoint: v2 Architecture Pivot — Ground-Up Redesign
- **Date:** 2026-04-14
- **Status:** Complete (PROPOSED — awaiting HITM approval)
- **Decision:** Retire the Crafted Intelligence Prompt Engine (v1) entirely and redesign the intelligence delivery layer to be native to Oracle's AI Companion framework. Custom Tool Scripts (data layer) are retained. Everything above the tool layer is rebuilt.
- **Key Changes:**
  - 7 v1 custom records retired (playbook, sections, shared sections, exec log, 3 lists)
  - 10 Prompt Engine tools retired; 2 retained (detectAccountConfig, getAccountConfig)
  - 4 new companion tools replace 12 old ones (getPromptMeta, seedPrompt, updatePrompt, logExecution)
  - Tiered governance (minimal/standard/governed/supervised) replaces 13-section framework
- **Trigger:** Luke's directive: "We want to retire the old prompt engine and redesign it through Oracle's companion framework"
- **Artifact:** `docs/specs/ADR-001-companion-native-architecture.md`
- **Related Updates:** CLAUDE.md rewritten for v2 framing; discovery document revised for v2 scope
- **Approved by:** Pending HITM review of ADR-001

### Checkpoint: Live Test — Prompt Studio & Meta Block Visibility
- **Date:** 2026-04-14
- **Status:** Complete
- **Test 1 (OQ-003): Prompt Studio Parameter UI**
  - **Finding:** Prompt Studio is a standard custom record entry form. The Prompt field is a plain text area with no structured parameter input. `[BRACKET]` placeholders are not interpreted — they're just text.
  - **Resolution:** `params` schema in extension record is **advisory for the AI**, not driving any UI. AI uses it to validate user input and provide hints. OQ-003 resolved.
- **Test 2 (A-002): Embedded Meta Block Visibility**
  - **Finding:** Oracle's Companion Library Suitelet renders prompt text as **plain text, not HTML**. HTML comments (`<!-- -->`) are displayed verbatim to users — not hidden.
  - **Resolution:** **Embedded meta block approach abandoned.** All orchestration metadata moved to extension record (`customrecord_dz_prompt_meta`). Prompt text stays clean and user-facing. AI retrieves context via `getPromptMeta`. A-002 disproven. ADR-001, CLAUDE.md, and discovery document updated accordingly.
- **Artifact:** Screenshots captured by Luke in sandbox (TSTDRV1912378)
- **Approved by:** Luke (HITM) — confirmed Option A (extension record only)

### Checkpoint: OQ-001 Resolved — UIF SPA Suitelet (Phase 1)
- **Date:** 2026-04-14
- **Status:** Complete
- **Decision:** Build Crafted Companion Library as a UIF SPA Suitelet in Phase 1 (promoted from Phase 2). Use Oracle's `@uif-js/core` + `@uif-js/component` framework for native NetSuite look and feel.
- **Key features:** Domain tabs (TabPanel), edition filtering (FilterPanel + detectAccountConfig), search (TextBox), prompt detail modals (Modal), governance badges (Badge), tool chain preview, action buttons (Copy, Send to Claude)
- **Reference files:** All 3 Oracle agent-skills downloaded to `docs/oracle-agent-skills/` — UIF SPA Reference (core.d.ts 190KB, component.d.ts 484KB), AI Connector Instructions (Redwood tokens), SDF Roles & Permissions
- **Also confirmed:** `@oracle/netsuite-uif-types` npm package available (v8.0.x for 2025.2) for IDE type checking during development
- **Trigger:** Luke confirmed SPA approach after reviewing Oracle's Companion Library UI pattern
- **Approved by:** Luke (HITM)

### Checkpoint: OQ-002 Resolved — Hard Tool Validation
- **Date:** 2026-04-14
- **Status:** Complete
- **Decision:** Tool validation is **HARD, not soft**. The Crafted Companion Library SPA will not display a prompt if its required toolset is not deployed and connected. No soft warnings or "might not work" badges — if the tools aren't there, the prompt doesn't appear. An admin banner shows which toolsets need deployment to unlock additional domains.
- **Implementation:** SPA checks tool availability via `detectAccountConfig` + extension record `tool_deps` field. Prompts with undeployed toolsets are filtered out of the rendered list.
- **Impact:** FR-006 promoted from SHOULD HAVE to MUST HAVE.
- **Trigger:** Luke's directive: "I think the toolset deployment should be required and hard."
- **Approved by:** Luke (HITM)

### Checkpoint: OQ-004 Resolved — Update in Place Versioning
- **Date:** 2026-04-14
- **Status:** Complete
- **Decision:** Update Atlas prompt records in place (same ID/externalID). Extension record `version` field tracks semantic version. `logExecution` records which version was running. No duplicate prompt records. Phase 2 can add version history sub-record if needed.
- **Trigger:** Luke confirmed Option A (update in place) after reviewing both options.
- **Approved by:** Luke (HITM)

### Checkpoint: Live Test — Roles Extensibility
- **Date:** 2026-04-14
- **Status:** Complete
- **Finding:** AI Companion Roles are a **custom record type** (`customrecord_atlas_aicomp_prompt_roles`), NOT a bundle-locked list. Prompt Studio has a "+" button to create new roles. Categories and Industries remain locked custom lists. Also discovered: `customlist_atlas_aicomp_mapping_method` list with "AI Mapped" value (`val_atlas_aicomp_mapped`).
- **Impact:** R-008 (role mapping gap) resolved. G-007 resolution updated. Crafted-specific roles (Distiller, Cellar Master, etc.) can be created and assigned to prompts.
- **Approved by:** Luke (HITM) — confirmed from live sandbox inspection

### Checkpoint: HITM Approval — ADR-001 + Discovery Document
- **Date:** 2026-04-14
- **Status:** Complete
- **Decision:** v2 architecture approved. All open design questions resolved (OQ-001 through OQ-004, A-002). Discovery document approved. Project cleared to advance to Scoping phase.
- **Approved by:** Luke (HITM)

---

## Pending Gates

### DISCOVERY → SCOPING
- [x] v2 Architecture Decision Record (ADR-001) written and checkpoint logged
- [x] CLAUDE.md rewritten for v2 companion-native framing
- [x] Discovery document revised for v2 scope
- [x] Live test: Prompt Studio parameter UI behavior (OQ-003) — plain text only, no structured input
- [x] Live test: Meta block visibility (A-002) — HTML comments visible; embedded approach abandoned
- [x] OQ-001 resolved: UIF SPA Suitelet as Phase 1 deliverable
- [x] OQ-003 resolved: params schema is advisory for AI, not UI-driven
- [x] Oracle agent-skills reference files downloaded to project
- [x] HITM approval of ADR-001 (v2 architecture decision)
- [x] OQ-002 resolved: Hard tool validation — prompts hidden if toolset not deployed
- [x] OQ-004 resolved: Update in place, version tracked on extension record
- [x] HITM approval of discovery document

### SCOPING → PLANNING
- [x] Scope document with deliverables list (`docs/specs/scope-document.md`)
- [x] Effort estimates per phase (Phase 1: ~352 hrs, Phase 2: ~84.5 hrs base)
- [x] Phase 1 vs Phase 2 boundary defined (Phase 1 = SDF + tools + SPA + barrel + v1 retirement)
- [x] HITM approval of scope document
- [x] Complete 8-object Atlas schema trace (all fields, joins, data)

### Checkpoint: HITM Approval — Scope Document
- **Date:** 2026-04-14
- **Status:** Complete
- **Decision:** Scope document approved. Phase 1 (MVP, ~352 hrs) and Phase 2 (Expansion, ~84.5 hrs) boundaries confirmed. Project cleared to advance to Planning phase.
- **Also completed:** Full 8-object Atlas AI Companion schema trace with Record Browser validation
- **Approved by:** Luke (HITM)

### Checkpoint: Session 1 — SDF Object XML Complete
- **Date:** 2026-04-14
- **Status:** Complete (awaiting HITM review)
- **Deliverables:**
  - `src/Objects/customlist_dz_pm_edition.xml` — 4 values (FOUND-001)
  - `src/Objects/customlist_dz_pm_complexity.xml` — 4 values (FOUND-002)
  - `src/Objects/customlist_dz_pm_status.xml` — 4 values (FOUND-003)
  - `src/Objects/customlist_dz_pm_domain.xml` — 6 values (NEW — standalone, replaces cross-package ref)
  - `src/Objects/customrecord_dz_prompt_meta.xml` — 18 fields (FOUND-004)
  - `src/Objects/customrecord_dz_exec_log.xml` — 8 fields (FOUND-005)
  - `src/Objects/custtoolset_crafted_companion.xml` — placeholder with both expose flags (FOUND-006)
- **Design decisions:**
  - `prompt_ref` is INTEGER (not SELECT) because Atlas record type is bundle-locked
  - Created `customlist_dz_pm_domain` in this package instead of cross-referencing `customlist_dz_ap_domain` from prompt-engine — crafted-companion is a standalone repo/package
  - JSON fields (steps, tool_deps, params, safety_rules) use CLOBTEXT for complex structures
  - Exec log includes `agent` field (claude/chatgpt) to supplement Oracle's built-in counters
- **Branch:** `phase-0/foundation-sdf-objects`
- **Approved by:** Luke (HITM)

### Checkpoint: Session 2 — SDF Deploy + Verify (M-0 Foundation Deployed)
- **Date:** 2026-04-14
- **Status:** Complete
- **Deployed to:** TSTDRV1912378
- **SuiteQL verification:** All 4 lists (18 values total), 2 records (26 fields total), 1 toolset confirmed queryable
- **Deploy fixes applied:** selectrecordtype syntax, aidescription length, list name length, toolset scriptid length, removed unsupported aidescription from lists, removed unsupported isunique
- **Lessons learned:** aidescription only on records/fields (not lists); selectrecordtype uses `[scriptid=xxx]`; toolset scriptid max 27 chars; list name max 30 chars
- **List value IDs:** Edition (1-4), Complexity (1-4), Status (1-4), Domain (1-6)
- **Approved by:** Luke (HITM)

### PLANNING → DEVELOPMENT
- [x] SDF object XML written and reviewed
- [x] Chunked task breakdown (`docs/task_plan.md` — 50 chunks across 5 phases, 17 sessions)
- [x] HITM approval to advance to development (M-0 gate passed 2026-04-14)

### DEVELOPMENT → QA (Phase 1: Companion Toolset)
- [ ] Extension record deployed and queryable (DONE — Phase 0)
- [ ] All 4 companion tools implemented and tested
- [ ] All barrel prompts have extension records
- [ ] HITM approval recorded
